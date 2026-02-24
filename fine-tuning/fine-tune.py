#!/usr/bin/env python3
"""
File Engine — OpenAI GPT-4o Fine-Tuning Pipeline

Usage:
  1. Set your OpenAI API key: export OPENAI_API_KEY=sk-...
  2. Run: python3 fine-tune.py train
  3. Check status: python3 fine-tune.py status
  4. Test when done: python3 fine-tune.py test "Build me a landing page"
"""

import sys
import os
import json
import time

try:
    from openai import OpenAI
except ImportError:
    print("Install openai: pip install openai")
    sys.exit(1)

client = OpenAI()

TRAINING_FILE = "training-data.jsonl"
SUFFIX = "file-engine-v1"

def validate():
    """Validate training data format"""
    errors = []
    with open(TRAINING_FILE) as f:
        lines = f.readlines()
    
    print(f"Validating {len(lines)} examples...")
    
    for i, line in enumerate(lines):
        try:
            data = json.loads(line)
        except json.JSONDecodeError as e:
            errors.append(f"Line {i+1}: Invalid JSON — {e}")
            continue
        
        if "messages" not in data:
            errors.append(f"Line {i+1}: Missing 'messages' key")
            continue
        
        messages = data["messages"]
        if len(messages) < 2:
            errors.append(f"Line {i+1}: Need at least 2 messages (system+user or user+assistant)")
            continue
        
        roles = [m["role"] for m in messages]
        if roles[0] not in ("system", "user"):
            errors.append(f"Line {i+1}: First message must be 'system' or 'user', got '{roles[0]}'")
        
        for j, msg in enumerate(messages):
            if "role" not in msg or "content" not in msg:
                errors.append(f"Line {i+1}, message {j+1}: Missing 'role' or 'content'")
    
    if errors:
        print(f"\n❌ {len(errors)} errors found:")
        for e in errors:
            print(f"  {e}")
        return False
    
    # Stats
    total_tokens = 0
    for line in lines:
        data = json.loads(line)
        chars = sum(len(m["content"]) for m in data["messages"])
        total_tokens += chars // 4
    
    print(f"✅ All {len(lines)} examples valid")
    print(f"   Total: ~{total_tokens} tokens")
    print(f"   Estimated cost: ~${total_tokens * 25 / 1_000_000:.2f} per epoch (3 epochs default = ~${total_tokens * 25 * 3 / 1_000_000:.2f})")
    print(f"   Estimated time: 15-60 minutes")
    return True


def train():
    """Upload training data and start fine-tuning"""
    if not validate():
        print("\nFix errors before training.")
        return
    
    print(f"\nUploading {TRAINING_FILE}...")
    with open(TRAINING_FILE, "rb") as f:
        file_obj = client.files.create(file=f, purpose="fine-tune")
    print(f"✅ Uploaded: {file_obj.id}")
    
    print(f"\nStarting fine-tuning job (gpt-4o-2024-08-06, suffix={SUFFIX})...")
    job = client.fine_tuning.jobs.create(
        training_file=file_obj.id,
        model="gpt-4o-2024-08-06",
        suffix=SUFFIX,
    )
    print(f"✅ Job created: {job.id}")
    print(f"   Status: {job.status}")
    print(f"\nMonitor with: python3 fine-tune.py status {job.id}")
    print(f"Or check: https://platform.openai.com/finetune/{job.id}")
    
    # Save job ID
    with open(".fine-tune-job", "w") as f:
        f.write(job.id)
    

def status(job_id=None):
    """Check fine-tuning job status"""
    if not job_id:
        if os.path.exists(".fine-tune-job"):
            job_id = open(".fine-tune-job").read().strip()
        else:
            # List recent jobs
            jobs = client.fine_tuning.jobs.list(limit=5)
            for j in jobs:
                print(f"{j.id} | {j.status} | {j.model} | {j.fine_tuned_model or 'pending'}")
            return
    
    job = client.fine_tuning.jobs.retrieve(job_id)
    print(f"Job: {job.id}")
    print(f"Status: {job.status}")
    print(f"Model: {job.model}")
    print(f"Fine-tuned model: {job.fine_tuned_model or 'not ready yet'}")
    
    if job.status == "succeeded":
        print(f"\n🎉 TRAINING COMPLETE!")
        print(f"Model ID: {job.fine_tuned_model}")
        print(f"\nTo use in File Engine, add this model to your config:")
        print(f"  MODEL_ID={job.fine_tuned_model}")
        print(f"\nTest with: python3 fine-tune.py test \"Build me a landing page\"")
    elif job.status == "failed":
        print(f"\n❌ Training failed")
        if job.error:
            print(f"Error: {job.error}")
    elif job.status in ("running", "queued", "validating_files"):
        print(f"\n⏳ Training in progress...")
        # Show events
        events = client.fine_tuning.jobs.list_events(fine_tuning_job_id=job_id, limit=5)
        for event in events:
            print(f"  [{event.created_at}] {event.message}")


def test(prompt):
    """Test the fine-tuned model"""
    # Find model ID
    model_id = None
    if os.path.exists(".fine-tune-job"):
        job_id = open(".fine-tune-job").read().strip()
        job = client.fine_tuning.jobs.retrieve(job_id)
        model_id = job.fine_tuned_model
    
    if not model_id:
        print("No fine-tuned model found. Run 'train' first.")
        return
    
    print(f"Testing model: {model_id}")
    print(f"Prompt: {prompt}\n")
    print("--- Response ---\n")
    
    response = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": "You are Aether, a world-class AI software engineer inside File Engine. You write production-quality code, debug systematically, and design with intention. Output code via ```language:filepath blocks. HTML must include <!DOCTYPE html>. Always mobile responsive. Brief intro then full code."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=4096,
        temperature=0.7
    )
    
    print(response.choices[0].message.content)
    print(f"\n--- Tokens used: {response.usage.total_tokens} ---")


def watch(job_id=None):
    """Watch training progress until complete"""
    if not job_id:
        if os.path.exists(".fine-tune-job"):
            job_id = open(".fine-tune-job").read().strip()
        else:
            print("No job ID found. Run 'train' first.")
            return
    
    print(f"Watching job {job_id}...")
    seen_events = set()
    
    while True:
        job = client.fine_tuning.jobs.retrieve(job_id)
        
        # Show new events
        events = client.fine_tuning.jobs.list_events(fine_tuning_job_id=job_id, limit=20)
        for event in reversed(list(events)):
            if event.id not in seen_events:
                seen_events.add(event.id)
                print(f"  {event.message}")
        
        if job.status == "succeeded":
            print(f"\n🎉 TRAINING COMPLETE!")
            print(f"Model ID: {job.fine_tuned_model}")
            break
        elif job.status == "failed":
            print(f"\n❌ Training failed: {job.error}")
            break
        
        time.sleep(30)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 fine-tune.py validate     — Check training data")
        print("  python3 fine-tune.py train         — Upload data and start training")
        print("  python3 fine-tune.py status [id]   — Check job status")
        print("  python3 fine-tune.py watch [id]    — Watch until complete")
        print("  python3 fine-tune.py test \"prompt\" — Test the fine-tuned model")
        sys.exit(0)
    
    cmd = sys.argv[1]
    if cmd == "validate":
        validate()
    elif cmd == "train":
        train()
    elif cmd == "status":
        status(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == "watch":
        watch(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == "test":
        if len(sys.argv) < 3:
            print("Usage: python3 fine-tune.py test \"your prompt here\"")
        else:
            test(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
