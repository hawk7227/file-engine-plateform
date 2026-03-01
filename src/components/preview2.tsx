'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type LeftTab = 'chat' | 'routes' | 'video' | 'images' | 'sql' | 'code'
type RightTab = 'inspect' | 'measure' | 'shots' | 'a11y'

interface DevicePreset {
  w: number; h: number; dpr: number; safeT: number; safeB: number
  type: 'phone' | 'tablet' | 'desktop'; label: string; os: string
}

interface ChatMsg { role: 'user' | 'ai'; text: string; code?: { lang: string; content: string }; actions?: { label: string; onClick: () => void }[] }
interface RouteItem { label: string; route: string; file: string; status: 'live' | 'warn' }
interface RouteSection { section: string; items: RouteItem[] }
interface VideoJob { id: string; title: string; status: 'pending'|'running'|'complete'|'failed'; progress: number; model: string; duration: number; cost: number; task_id?: string; output_url?: string }
interface GenImage { id: string; prompt: string; url: string; size: string; status: 'complete'|'generating' }

const DEVICES: Record<string, DevicePreset> = {
  'iphone-se':     { w:375,h:667,dpr:2,safeT:20,safeB:0,type:'phone',label:'iPhone SE',os:'iOS' },
  'iphone-15-pro': { w:393,h:852,dpr:3,safeT:59,safeB:34,type:'phone',label:'iPhone 15 Pro',os:'iOS' },
  'iphone-16-pm':  { w:440,h:956,dpr:3,safeT:59,safeB:34,type:'phone',label:'iPhone 16 PM',os:'iOS' },
  'pixel-8':       { w:412,h:915,dpr:2.6,safeT:24,safeB:0,type:'phone',label:'Pixel 8',os:'Android' },
  'galaxy-s24':    { w:360,h:780,dpr:3,safeT:24,safeB:0,type:'phone',label:'Galaxy S24',os:'Android' },
  'ipad-air':      { w:820,h:1180,dpr:2,safeT:24,safeB:20,type:'tablet',label:'iPad Air',os:'iPadOS' },
  'macbook-air':   { w:1440,h:900,dpr:2,safeT:0,safeB:0,type:'desktop',label:'MacBook Air',os:'macOS' },
  'desktop-1080':  { w:1920,h:1080,dpr:1,safeT:0,safeB:0,type:'desktop',label:'1080p',os:'Windows' },
}

const ROUTES: RouteSection[] = [
  { section:'Patient App', items:[
    {label:'Landing',route:'/',file:'page.tsx',status:'live'},
    {label:'Express Checkout',route:'/express-checkout',file:'express-checkout/page.tsx',status:'live'},
    {label:'Success',route:'/success',file:'success/page.tsx',status:'live'},
    {label:'Login',route:'/login',file:'login/page.tsx',status:'live'},
  ]},
  { section:'Doctor Panel', items:[
    {label:'Dashboard',route:'/doctor/dashboard',file:'doctor/dashboard/page.tsx',status:'live'},
    {label:'Appointments',route:'/doctor/appointments',file:'doctor/appointments/page.tsx',status:'live'},
    {label:'Messaging',route:'/doctor/messaging',file:'doctor/messaging/page.tsx',status:'warn'},
    {label:'Video Call',route:'/doctor/video',file:'doctor/video/page.tsx',status:'live'},
  ]},
  { section:'Admin', items:[
    {label:'Dashboard',route:'/admin/dashboard',file:'admin/dashboard/page.tsx',status:'live'},
    {label:'Preview Lab',route:'/admin/preview-lab',file:'admin/preview-lab/page.tsx',status:'live'},
    {label:'Patients',route:'/admin/patients',file:'admin/patients/page.tsx',status:'live'},
    {label:'Campaigns',route:'/admin/campaigns',file:'admin/campaigns/page.tsx',status:'live'},
  ]},
]

async function apiCall(endpoint: string, body: any) {
  const res = await fetch(`/api/preview-lab/${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(()=>({error:res.statusText})); throw new Error(err.error||`API error ${res.status}`) }
  return res.json()
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function PreviewLabPage() {
  const [leftTab, setLeftTab] = useState<LeftTab>('chat')
  const [rightTab, setRightTab] = useState<RightTab>('inspect')
  const [rightOpen, setRightOpen] = useState(true)
  const [consoleOpen, setConsoleOpen] = useState(true)

  // Device preview
  const [device, setDevice] = useState('iphone-15-pro')
  const [orientation, setOrientation] = useState<'portrait'|'landscape'>('portrait')
  const [zoom, setZoom] = useState(70)
  const [previewMode, setPreviewMode] = useState<'live'|'sandbox'|'dev'>('live')
  const [currentRoute, setCurrentRoute] = useState('/')
  const [env, setEnv] = useState<'staging'|'production'>('staging')

  // Drag
  const [dragPos, setDragPos] = useState({x:0,y:0})
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({sx:0,sy:0,ox:0,oy:0})

  // Chat
  const [chatInput, setChatInput] = useState('')
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    {role:'user',text:'Show all patients who booked today with Stripe payment info'},
    {role:'ai',text:'Here\'s the query joining appointments with Stripe payments:',
      code:{lang:'SQL',content:`SELECT p.full_name, p.email,\n  a.status AS appt_status,\n  CASE s.status\n    WHEN 'succeeded' THEN 'Paid'\n    WHEN 'pending' THEN 'Pending'\n    ELSE COALESCE(s.status,'N/A')\n  END AS payment\nFROM appointments a\nJOIN patients p ON p.id = a.patient_id\nLEFT JOIN stripe_payments s ON s.appointment_id = a.id\nWHERE a.scheduled_at::date = CURRENT_DATE;`},
      actions:[
        {label:' Run SQL',onClick:()=>setLeftTab('sql')},
        {label:'▶ Execute',onClick:()=>toast('Executed','8 rows · 23ms','success')},
      ]},
  ])

  // Video
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDuration, setVideoDuration] = useState(8)
  const [videoModel, setVideoModel] = useState('gen4_turbo')
  const [videoRatio, setVideoRatio] = useState('1280:720')
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([])
  const [videoRunning, setVideoRunning] = useState(false)
  const [refImage, setRefImage] = useState<File|null>(null)
  const [refImagePrev, setRefImagePrev] = useState('')
  const [refVideo, setRefVideo] = useState<File|null>(null)
  const [refVideoName, setRefVideoName] = useState('')
  const [charMode, setCharMode] = useState(false)
  const [playerUrl, setPlayerUrl] = useState('')
  const pollRef = useRef<NodeJS.Timeout|null>(null)

  // Images
  const [imgPrompt, setImgPrompt] = useState('')
  const [imgSize, setImgSize] = useState<'1024x1024'|'1792x1024'|'1024x1792'>('1024x1024')
  const [imgBatch, setImgBatch] = useState(4)
  const [imgRunning, setImgRunning] = useState(false)
  const [genImgs, setGenImgs] = useState<GenImage[]>([])

  // SQL
  const [sqlQ, setSqlQ] = useState(`SELECT p.full_name, p.email, a.status, a.scheduled_at\nFROM appointments a\nJOIN patients p ON p.id = a.patient_id\nWHERE a.scheduled_at::date = CURRENT_DATE\nLIMIT 10;`)
  const [sqlRows, setSqlRows] = useState<any[]|null>(null)
  const [sqlCols, setSqlCols] = useState<string[]>([])
  const [sqlRunning, setSqlRunning] = useState(false)

  // Toast
  const [toasts, setToasts] = useState<{id:string;title:string;msg:string;type:string}[]>([])

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current) } }, [])

  function toast(title:string, msg:string, type:'success'|'error'|'info'='info') {
    const id = crypto.randomUUID()
    setToasts(p=>[...p,{id,title,msg,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500)
  }

  const d = DEVICES[device]
  let screenW = d.w, screenH = d.h
  if (orientation==='landscape') { const t=screenW; screenW=screenH; screenH=t }
  const baseUrl = env==='production' ? 'https://patient.medazonhealth.com' : 'https://staging.patient.medazonhealth.com'
  const fullUrl = `${baseUrl}${currentRoute}`

  // Drag handlers
  const onDragStart = useCallback((e:React.MouseEvent)=>{
    if ((e.target as HTMLElement).closest('iframe')) return
    setIsDragging(true)
    dragRef.current = {sx:e.clientX,sy:e.clientY,ox:dragPos.x,oy:dragPos.y}
    e.preventDefault()
  },[dragPos])

  useEffect(()=>{
    if (!isDragging) return
    const onMove=(e:MouseEvent)=>setDragPos({x:dragRef.current.ox+e.clientX-dragRef.current.sx,y:dragRef.current.oy+e.clientY-dragRef.current.sy})
    const onUp=()=>setIsDragging(false)
    window.addEventListener('mousemove',onMove)
    window.addEventListener('mouseup',onUp)
    return ()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
  },[isDragging])

  // ═══ VIDEO PIPELINE ═══
  async function runVideoPipeline() {
    if (!videoPrompt.trim()) { toast('Error','Enter a prompt','error'); return }
    setVideoRunning(true)
    const job: VideoJob = { id:crypto.randomUUID(), title:videoTitle||videoPrompt.slice(0,40), status:'running', progress:0, model:videoModel, duration:videoDuration, cost:videoDuration*(videoModel==='gen4.5'?0.10:0.05) }
    setVideoJobs(p=>[job,...p])
    try {
      let imgUrl = ''
      if (refImage) {
        setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,progress:10}:j))
        const b64 = await fileToBase64(refImage)
        const {runway_uri} = await apiCall('video',{action:'upload-reference',file_base64:b64,file_name:refImage.name,content_type:refImage.type})
        imgUrl = runway_uri
      }
      let vidUrl = ''
      if (refVideo) {
        setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,progress:20}:j))
        const b64 = await fileToBase64(refVideo)
        const {runway_uri} = await apiCall('video',{action:'upload-reference',file_base64:b64,file_name:refVideo.name,content_type:refVideo.type})
        vidUrl = runway_uri
      }
      setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,progress:30}:j))
      let taskResult
      if (charMode && imgUrl && vidUrl) {
        taskResult = await apiCall('video',{action:'character-perform',character_image_url:imgUrl,reference_video_url:vidUrl})
      } else if (imgUrl) {
        taskResult = await apiCall('video',{action:'generate-video',image_url:imgUrl,prompt_text:videoPrompt,model:videoModel,duration:videoDuration,ratio:videoRatio})
      } else {
        taskResult = await apiCall('video',{action:'generate-video',prompt_text:videoPrompt,text_only:true,model:videoModel,duration:videoDuration,ratio:videoRatio})
      }
      const taskId = taskResult.task_id
      setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,task_id:taskId,progress:40}:j))
      pollRef.current = setInterval(async()=>{
        try {
          const st = await apiCall('video',{action:'check-task',task_id:taskId})
          if (st.status==='SUCCEEDED'&&st.output?.[0]) {
            clearInterval(pollRef.current!); pollRef.current=null
            setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,status:'complete',progress:100,output_url:st.output[0]}:j))
            setPlayerUrl(st.output[0]); setVideoRunning(false); toast('Video Ready',job.title,'success')
          } else if (st.status==='FAILED') {
            clearInterval(pollRef.current!); pollRef.current=null
            setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,status:'failed'}:j))
            setVideoRunning(false); toast('Failed',st.failure||'Unknown','error')
          } else {
            setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,progress:40+Math.min(55,(st.progress||0)*55)}:j))
          }
        } catch{}
      },5000)
    } catch(err:any) {
      setVideoJobs(p=>p.map(j=>j.id===job.id?{...j,status:'failed'}:j))
      setVideoRunning(false); toast('Error',err.message,'error')
    }
  }

  // ═══ IMAGE GENERATION ═══
  async function runImageGen() {
    if (!imgPrompt.trim()) { toast('Error','Enter a prompt','error'); return }
    setImgRunning(true)
    const phs: GenImage[] = Array.from({length:imgBatch},(_,i)=>({id:`g-${Date.now()}-${i}`,prompt:imgPrompt,url:'',size:imgSize,status:'generating' as const}))
    setGenImgs(p=>[...phs,...p])
    try {
      const data = await apiCall('images',{ action:imgBatch===1?'generate':'batch-generate', prompt:imgPrompt, count:imgBatch, size:imgSize, quality:'hd', style:'natural', variations:true })
      const results = imgBatch===1 ? [{status:'success',image:data.image}] : (data.results||[])
      setGenImgs(p=>{
        const clean = p.filter(img=>!phs.find(ph=>ph.id===img.id))
        const fresh = results.filter((r:any)=>r.status==='success'&&r.image).map((r:any)=>({id:r.image.id||crypto.randomUUID(),prompt:r.image.prompt,url:r.image.url,size:r.image.size,status:'complete' as const}))
        return [...fresh,...clean]
      })
      toast('Generated',`${results.filter((r:any)=>r.status==='success').length} images`,'success')
    } catch(err:any) {
      setGenImgs(p=>p.filter(img=>!phs.find(ph=>ph.id===img.id)))
      toast('Error',err.message,'error')
    } finally { setImgRunning(false) }
  }

  // ═══ SQL ═══
  async function runSql() {
    setSqlRunning(true); setSqlRows(null)
    try {
      const data = await apiCall('sql',{query:sqlQ})
      setSqlCols(data.columns||(data.rows?.[0]?Object.keys(data.rows[0]):[]))
      setSqlRows(data.rows||[])
      toast('SQL',`${(data.rows||[]).length} rows`,'success')
    } catch(err:any) { toast('SQL Error',err.message,'error') }
    finally { setSqlRunning(false) }
  }

  // ═══ CHAT ═══
  async function sendChat() {
    if (!chatInput.trim()) return
    const msg: ChatMsg = {role:'user',text:chatInput}
    setChatMsgs(p=>[...p,msg]); setChatInput('')
    try {
      const data = await apiCall('chat',{messages:[...chatMsgs,msg].map(m=>({role:m.role==='ai'?'assistant':'user',content:m.text}))})
      setChatMsgs(p=>[...p,{role:'ai',text:data.content||data.message||'No response'}])
    } catch(err:any) { setChatMsgs(p=>[...p,{role:'ai',text:`Error: ${err.message}`}]) }
  }

  // Styles
  const chip = (on:boolean) => `px-2 py-1 rounded-lg text-[8px] font-bold border cursor-pointer transition-all ${on?'bg-emerald-500/10 border-emerald-500/25 text-emerald-400':'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`
  const chipP = (on:boolean) => `px-2 py-1 rounded-lg text-[8px] font-bold border cursor-pointer transition-all ${on?'bg-purple-500/10 border-purple-500/25 text-purple-400':'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`
  const secCls = 'p-3 border-b border-zinc-800'
  const lblCls = 'text-[7px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block'
  const inputCls = 'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-zinc-600 focus:border-emerald-500/30 focus:outline-none'

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-[calc(100vh-0px)] bg-[#09090b] text-white overflow-hidden" style={{fontFamily:"'Inter',-apple-system,sans-serif"}}>

      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="w-[300px] bg-[#050507] border-r border-zinc-800 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-[9px] font-black text-black shadow-lg shadow-emerald-500/20 shrink-0">FE</div>
          <div><div className="text-[12px] font-extrabold tracking-tight">Preview Lab</div><div className="text-[7px] text-zinc-500 font-semibold uppercase tracking-widest">IDE</div></div>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-zinc-800" style={{scrollbarWidth:'none'}}>
          {([['chat',''],['routes',''],['video',''],['images',''],['sql',''],['code','']] as [LeftTab,string][]).map(([id,icon])=>(
            <button key={id} onClick={()=>setLeftTab(id as LeftTab)} className={`flex-1 py-1.5 text-center border-b-2 text-[7px] font-bold uppercase tracking-widest cursor-pointer transition-all ${leftTab===id?'text-emerald-400 border-emerald-400 bg-emerald-400/[.03]':'text-zinc-600 border-transparent hover:text-zinc-400'}`}>{icon} {id}</button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:'#3f3f46 transparent'}}>

          {/* CHAT TAB */}
          {leftTab==='chat'&&(
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatMsgs.map((m,i)=>(
                  <div key={i} className="flex gap-2 p-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] shrink-0 mt-0.5 ${m.role==='ai'?'bg-emerald-500/10 border border-emerald-500/20':'bg-zinc-800'}`}>{m.role==='ai'?'':''}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[7px] font-bold uppercase tracking-wider mb-0.5 ${m.role==='ai'?'text-emerald-400':'text-zinc-500'}`}>{m.role==='ai'?'File Engine':'Marcus'}</div>
                      <div className="text-[11px] leading-relaxed text-zinc-300">{m.text}</div>
                      {m.code&&(
                        <div className="mt-1.5 bg-[#09090b] border border-zinc-800 rounded-md overflow-hidden">
                          <div className="flex justify-between px-2 py-0.5 bg-zinc-900/50 border-b border-zinc-800 text-[6px] font-bold text-zinc-500 uppercase font-mono">
                            <span>{m.code.lang}</span>
                            <button onClick={()=>{navigator.clipboard.writeText(m.code!.content);toast('Copied','','success')}} className="hover:text-emerald-400 cursor-pointer">Copy</button>
                          </div>
                          <pre className="p-2 text-[9px] text-zinc-400 font-mono leading-relaxed overflow-x-auto whitespace-pre">{m.code.content}</pre>
                        </div>
                      )}
                      {m.actions&&(<div className="flex flex-wrap gap-1 mt-1.5">{m.actions.map((a,j)=>(<button key={j} onClick={a.onClick} className="px-2 py-0.5 rounded-md text-[7px] font-bold border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5">{a.label}</button>))}</div>)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-zinc-800 shrink-0">
                <div className="flex gap-1.5 items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 focus-within:border-emerald-500/25">
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Ask anything..." className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-zinc-600"/>
                  <button onClick={sendChat} className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 text-black text-[10px] font-black flex items-center justify-center shrink-0">↑</button>
                </div>
              </div>
            </div>
          )}

          {/* ROUTES TAB */}
          {leftTab==='routes'&&(
            <div>{ROUTES.map((sec,i)=>(
              <div key={i}>
                <div className="text-[7px] uppercase tracking-widest text-zinc-600 font-bold px-3 pt-3 pb-1">{sec.section}</div>
                {sec.items.map((r,j)=>(
                  <button key={j} onClick={()=>{setCurrentRoute(r.route);toast('Navigate',r.route,'info')}}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors ${currentRoute===r.route?'bg-emerald-500/5 text-emerald-400 font-semibold':'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}>
                    <span className="text-[9px]"></span>
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="text-[7px] text-zinc-600 font-mono truncate max-w-[70px]">{r.file}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.status==='live'?'bg-emerald-400 shadow-sm shadow-emerald-400/50':'bg-yellow-400 shadow-sm shadow-yellow-400/50'}`}/>
                  </button>
                ))}
              </div>
            ))}</div>
          )}

          {/* VIDEO TAB */}
          {leftTab==='video'&&(
            <div>
              {playerUrl&&(
                <div className={secCls}>
                  <span className={lblCls}>Now Playing</span>
                  <video src={playerUrl} controls className="w-full rounded-lg border border-zinc-800"/>
                  <div className="flex gap-1 mt-1.5">
                    <a href={playerUrl} download className="flex-1 text-center px-2 py-1 rounded-lg text-[8px] font-bold border border-zinc-800 text-zinc-400 hover:border-zinc-600"> Download</a>
                    <button onClick={()=>{navigator.clipboard.writeText(playerUrl);toast('Copied','','success')}} className="flex-1 px-2 py-1 rounded-lg text-[8px] font-bold border border-zinc-800 text-zinc-400 hover:border-zinc-600"> Copy</button>
                  </div>
                </div>
              )}
              <div className={secCls}><span className={lblCls}>Title</span><input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} placeholder="UTI Treatment Explainer" className={inputCls}/></div>
              <div className={secCls}><span className={lblCls}>Prompt</span><textarea value={videoPrompt} onChange={e=>setVideoPrompt(e.target.value)} placeholder="30-second explainer showing virtual UTI treatment..." rows={3} className={`${inputCls} resize-none`}/></div>
              {/* Reference uploads */}
              <div className={secCls}>
                <span className={lblCls}>Reference Media</span>
                <div className="mb-2">
                  <div className="text-[8px] text-zinc-400 mb-1"> Image (first frame / character)</div>
                  {refImagePrev?(
                    <div className="relative inline-block">
                      <img src={refImagePrev} className="w-16 h-16 object-cover rounded-lg border border-zinc-700"/>
                      <button onClick={()=>{setRefImage(null);setRefImagePrev('')}} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[7px] text-white flex items-center justify-center"></button>
                    </div>
                  ):(
                    <label className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 text-[9px] text-zinc-400">
                       Upload image<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setRefImage(f);setRefImagePrev(URL.createObjectURL(f))}} className="hidden"/>
                    </label>
                  )}
                </div>
                <div className="mb-2">
                  <div className="text-[8px] text-zinc-400 mb-1"> Video (character performance / style)</div>
                  {refVideoName?(
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[9px] text-zinc-300">
                       {refVideoName}<button onClick={()=>{setRefVideo(null);setRefVideoName('');setCharMode(false)}} className="text-red-400 text-[7px] ml-auto">Remove</button>
                    </div>
                  ):(
                    <label className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 text-[9px] text-zinc-400">
                       Upload video<input type="file" accept="video/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setRefVideo(f);setRefVideoName(f.name)}} className="hidden"/>
                    </label>
                  )}
                </div>
                {refImage&&refVideo&&(
                  <label className="flex items-center gap-2 px-2 py-1.5 bg-purple-500/5 border border-purple-500/20 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={charMode} onChange={e=>setCharMode(e.target.checked)} className="accent-purple-500"/>
                    <div><div className="text-[9px] text-purple-300 font-bold">Character Performance</div><div className="text-[7px] text-zinc-500">Image → walking/talking character</div></div>
                  </label>
                )}
              </div>
              {/* Settings */}
              <div className={secCls}>
                <div className="flex justify-between text-[8px] text-zinc-400 mb-1"><span>Duration</span><span className="text-emerald-400 font-bold">{videoDuration}s</span></div>
                <input type="range" min={2} max={10} value={videoDuration} onChange={e=>setVideoDuration(+e.target.value)} className="w-full accent-emerald-500 h-1"/>
                <div className="text-[8px] text-zinc-400 mt-2 mb-1">Model</div>
                <div className="flex gap-1">{[{id:'gen4_turbo',l:'Gen-4 Turbo'},{id:'gen4.5',l:'Gen-4.5'},{id:'gen3a_turbo',l:'Gen-3α'}].map(m=>(
                  <button key={m.id} onClick={()=>setVideoModel(m.id)} className={chip(videoModel===m.id)+' flex-1 text-center'}>{m.l}</button>
                ))}</div>
                <div className="text-[8px] text-zinc-400 mt-2 mb-1">Aspect Ratio</div>
                <div className="flex gap-1">{[['1280:720','16:9'],['720:1280','9:16'],['960:960','1:1']].map(([id,l])=>(
                  <button key={id} onClick={()=>setVideoRatio(id)} className={chip(videoRatio===id)+' flex-1 text-center'}>{l}</button>
                ))}</div>
              </div>
              <div className={secCls}>
                <button onClick={runVideoPipeline} disabled={videoRunning||!videoPrompt.trim()}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-black transition-all ${videoRunning?'bg-zinc-800 text-zinc-500 cursor-wait':'bg-gradient-to-r from-emerald-500 to-blue-500 text-black hover:shadow-lg hover:shadow-emerald-500/20'}`}>
                  {videoRunning?'⏳ Generating...':' Generate Video'}
                </button>
              </div>
              {videoJobs.length>0&&(
                <div className={secCls}>
                  <span className={lblCls}>Pipeline History</span>
                  {videoJobs.map(job=>(
                    <div key={job.id} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg mb-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-200 truncate">{job.title}</span>
                        <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded-full ${job.status==='complete'?'bg-emerald-500/10 text-emerald-400':job.status==='running'?'bg-blue-500/10 text-blue-400':job.status==='failed'?'bg-red-500/10 text-red-400':'bg-zinc-800 text-zinc-500'}`}>{job.status.toUpperCase()}</span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1"><div className={`h-full transition-all ${job.status==='complete'?'bg-emerald-500':job.status==='failed'?'bg-red-500':'bg-blue-500'}`} style={{width:`${job.progress}%`}}/></div>
                      <div className="flex gap-2 mt-1 text-[7px] text-zinc-500 font-mono"><span>{job.model}</span><span>{job.duration}s</span><span>${job.cost.toFixed(2)}</span></div>
                      {job.output_url&&<button onClick={()=>setPlayerUrl(job.output_url!)} className="mt-1 w-full py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400">▶ Play</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* IMAGES TAB */}
          {leftTab==='images'&&(
            <div>
              <div className={secCls}><span className={lblCls}>Prompt</span><textarea value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} placeholder="Professional telehealth consultation scene..." rows={3} className={`${inputCls} resize-none`}/></div>
              <div className={secCls}>
                <div className="text-[8px] text-zinc-400 mb-1">Size</div>
                <div className="flex gap-1">{([['1024x1024','1:1'],['1792x1024','16:9'],['1024x1792','9:16']] as const).map(([id,l])=>(
                  <button key={id} onClick={()=>setImgSize(id)} className={chipP(imgSize===id)+' flex-1 text-center'}>{l}</button>
                ))}</div>
                <div className="text-[8px] text-zinc-400 mt-2 mb-1">Batch</div>
                <div className="flex gap-1">{[1,2,4,8].map(n=>(
                  <button key={n} onClick={()=>setImgBatch(n)} className={chipP(imgBatch===n)+' flex-1 text-center'}>×{n}</button>
                ))}</div>
              </div>
              <div className={secCls}>
                <button onClick={runImageGen} disabled={imgRunning||!imgPrompt.trim()}
                  className={`w-full py-2.5 rounded-xl text-[11px] font-black transition-all ${imgRunning?'bg-zinc-800 text-zinc-500 cursor-wait':'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/20'}`}>
                  {imgRunning?'⏳ Generating...': ` Generate ${imgBatch>1?`${imgBatch} Images`:'Image'}`}
                </button>
              </div>
              {genImgs.length>0&&(
                <div className={secCls}>
                  <span className={lblCls}>Gallery ({genImgs.length})</span>
                  <div className="grid grid-cols-3 gap-1">{genImgs.map(img=>(
                    <div key={img.id} className="aspect-square rounded-lg border border-zinc-800 overflow-hidden">
                      {img.url?<img src={img.url} className="w-full h-full object-cover"/>:<div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] animate-pulse">⏳</div>}
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          )}

          {/* SQL TAB */}
          {leftTab==='sql'&&(
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 p-2 border-b border-zinc-800 shrink-0">
                <button onClick={runSql} disabled={sqlRunning} className="px-3 py-1.5 rounded-lg text-[8px] font-black bg-gradient-to-r from-emerald-500 to-blue-500 text-black">{sqlRunning?'⏳':'▶'} Run</button>
                <span className="text-[7px] text-zinc-500">⌘Enter</span>
                <span className="ml-auto text-[6px] font-mono text-zinc-600">supabase · public</span>
              </div>
              <textarea value={sqlQ} onChange={e=>setSqlQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))runSql()}} className="w-full h-20 bg-[#09090b] text-zinc-300 border-b border-zinc-800 p-2 font-mono text-[9px] leading-relaxed resize-none outline-none shrink-0" spellCheck={false}/>
              {sqlRows&&(
                <>
                  <div className="flex justify-between px-2 py-1 bg-zinc-900/50 border-b border-zinc-800 text-[8px] font-bold shrink-0"><span className="text-emerald-400">{sqlRows.length} rows</span><span className="text-zinc-500">SELECT · read-only</span></div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-[8px] font-mono">
                      <thead><tr>{sqlCols.map(c=><th key={c} className="px-2 py-1 text-left bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800 sticky top-0 whitespace-nowrap">{c}</th>)}</tr></thead>
                      <tbody>{sqlRows.map((row,i)=><tr key={i} className="hover:bg-white/[.01]">{sqlCols.map(c=><td key={c} className="px-2 py-0.5 text-zinc-400 border-b border-zinc-900/50 max-w-[100px] truncate">{String(row[c]??'')}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CODE TAB */}
          {leftTab==='code'&&(
            <div className="flex flex-col h-full" style={{background:'#1e1e2e'}}>
              <div className="flex border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                {['checkout.tsx','route.ts','BookingForm.tsx'].map((f,i)=>(
                  <div key={f} className={`px-2.5 py-1.5 text-[9px] border-r border-zinc-800 cursor-pointer ${i===0?'bg-[#1e1e2e] text-white font-semibold border-b-2 border-b-emerald-400':'text-zinc-500 hover:text-zinc-300'}`}>
                    {i===0&&<span className="text-yellow-400 text-[6px] mr-1">●</span>}{f}
                  </div>
                ))}
              </div>
              <div className="text-[7px] text-zinc-500 font-mono px-2 py-0.5 border-b border-zinc-800/50 shrink-0">src/app/express-checkout/page.tsx <span className="bg-zinc-800 px-1 rounded text-[6px]">TSX</span></div>
              <div className="flex-1 overflow-y-auto py-1 font-mono text-[10px] leading-[1.55]">
                {[
                  ['cm','// Express Checkout — Medazon Health'],['kw',"import { useState, useEffect } from 'react'"],['kw',"import { useRouter } from 'next/navigation'"],
                  ['kw',"import { BookingForm } from '@/components/BookingForm'"],['',''],['kw',"type Step = 'intake' | 'payment' | 'confirm'"],['',''],
                  ['fn','export default function ExpressCheckout() {'],['','  const [step, setStep] = useState<Step>(\'intake\')'],['','  const [loading, setLoading] = useState(true)'],
                  ['','  const [error, setError] = useState<string|null>(null)'],['','  const [patient, setPatient] = useState<Patient|null>(null)'],['','  const router = useRouter()'],['',''],
                  ['','  const email = patient?.email ?? \'\''],['',''],['','  useEffect(() => {'],['','    fetchPatient().then(p => {'],['','      setPatient(p); setLoading(false)'],
                  ['','    }).catch(e => setError(e.message))'],['','  }, [])'],['',''],['fn','  const handleSubmit = async (data: BookingData) => {'],['','    setError(null); setLoading(true)'],
                  ['kw','    try {'],['','      const appt = await createAppointment(data)'],['','      setStep(\'payment\')'],['','    } catch (e) { setError(e.message) }'],['','    finally { setLoading(false) }'],['','  }'],['',''],
                  ['kw','  if (loading) return <Skeleton />'],['kw','  if (error) return <ErrorBanner msg={error} />'],
                ].map(([cls,line],i)=>(
                  <div key={i} className="flex"><span className="w-8 text-right pr-2 text-zinc-600 select-none text-[9px]">{i+1}</span><span className={`flex-1 whitespace-pre ${cls==='cm'?'text-zinc-600 italic':cls==='kw'?'text-purple-400':cls==='fn'?'text-blue-400':'text-zinc-300'}`}>{line}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ CENTER PANEL ══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-zinc-800 bg-[#0d0d10] flex-wrap shrink-0" style={{minHeight:36}}>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex-1 max-w-[260px] min-w-[100px]">
            <span className="px-2 text-[9px] text-emerald-400"></span>
            <input value={`${baseUrl.replace('https://','')}`+currentRoute} readOnly className="flex-1 bg-transparent text-[9px] text-zinc-400 font-mono py-1 outline-none min-w-[60px]"/>
          </div>
          <div className="w-px h-4 bg-zinc-800"/>
          <div className="flex bg-zinc-900 rounded-lg border border-zinc-800 p-0.5 overflow-x-auto" style={{scrollbarWidth:'none'}}>
            {Object.entries(DEVICES).map(([id,dev])=>(
              <button key={id} onClick={()=>{setDevice(id);setDragPos({x:0,y:0})}} className={`px-1.5 py-0.5 rounded text-[7px] font-bold whitespace-nowrap transition-all ${device===id?'bg-emerald-500/10 text-emerald-400':'text-zinc-600 hover:text-zinc-300'}`}>{dev.label.split(' ').pop()}</button>
            ))}
          </div>
          <button onClick={()=>{setOrientation(o=>o==='portrait'?'landscape':'portrait');setDragPos({x:0,y:0})}} className="px-1.5 py-1 rounded-lg text-[9px] border border-zinc-800 text-zinc-400 hover:text-white bg-transparent">↻</button>
          <div className="w-px h-4 bg-zinc-800"/>
          <div className="flex items-center gap-0.5">
            <button onClick={()=>setZoom(z=>Math.max(20,z-10))} className="px-1 py-0.5 rounded text-[8px] border border-zinc-800 text-zinc-400 bg-transparent">−</button>
            <span className="text-[7px] font-mono text-zinc-400 w-7 text-center font-bold">{zoom}%</span>
            <button onClick={()=>setZoom(z=>Math.min(150,z+10))} className="px-1 py-0.5 rounded text-[8px] border border-zinc-800 text-zinc-400 bg-transparent">+</button>
          </div>
          <button onClick={()=>setDragPos({x:0,y:0})} className="px-1.5 py-1 rounded-lg text-[8px] border border-zinc-800 text-zinc-500 bg-transparent" title="Reset">⟳</button>
          <div className="w-px h-4 bg-zinc-800"/>
          <button onClick={()=>setRightOpen(p=>!p)} className="px-1.5 py-1 rounded-lg text-[8px] border border-zinc-800 text-zinc-500 bg-transparent">{rightOpen?'◀':'▶'}</button>
          <span className={`ml-auto text-[7px] font-bold font-mono px-2 py-0.5 rounded-full ${env==='production'?'bg-emerald-500/10 text-emerald-400':'bg-yellow-500/10 text-yellow-400'}`}>{env.toUpperCase()}</span>
        </div>

        {/* Device preview */}
        <div className="flex-1 flex items-center justify-center overflow-hidden" style={{background:'#050507',backgroundImage:'radial-gradient(circle at 50% 40%,rgba(18,24,18,.6),#050507 70%)'}}>
          <div style={{transform:`scale(${zoom/100}) translate(${dragPos.x/(zoom/100)}px,${dragPos.y/(zoom/100)}px)`,transformOrigin:'center center',cursor:isDragging?'grabbing':'grab'}} onMouseDown={onDragStart}>
            {d.type==='phone'&&(
              <div>
                <div className="relative" style={{width:screenW+24,height:screenH+24,border:'12px solid #1c1c1e',borderRadius:50,boxShadow:'inset 0 0 0 2px #3a3a3c,0 0 0 2px #3a3a3c,0 30px 60px rgba(0,0,0,.5)',background:'#000',overflow:'hidden'}}>
                  <div className="absolute z-10 flex items-center justify-center" style={{width:126,height:36,background:'#000',borderRadius:20,top:10,left:'50%',transform:'translateX(-50%)'}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:'#1a1a2e',border:'1px solid #2a2a3e'}}/>
                  </div>
                  <div className="flex flex-col" style={{width:screenW,height:screenH,borderRadius:38,overflow:'hidden'}}>
                    <div className="flex items-end justify-between shrink-0 text-white" style={{height:d.safeT,background:'#0a0e12',padding:'0 28px 6px',fontSize:12,fontWeight:600}}><span>9:41</span><span style={{fontSize:10}}>●●●● </span></div>
                    <div className="flex items-center shrink-0" style={{height:44,background:'#f8f8f8',borderBottom:'1px solid #e0e0e0',padding:'0 8px',gap:6}}>
                      <div className="flex gap-2 shrink-0" style={{fontSize:13,color:'#888'}}><span style={{opacity:.3}}>◀</span><span>▶</span></div>
                      <div className="flex-1 flex items-center" style={{background:'#fff',border:'1px solid #d0d0d0',borderRadius:20,padding:'5px 12px',fontSize:11,color:'#555',gap:4,minWidth:0,fontFamily:'sans-serif'}}>
                        <span style={{fontSize:10,color:'#22c55e'}}></span><span className="truncate">{baseUrl.replace('https://','')}{currentRoute}</span>
                      </div>
                      <span style={{border:'1.5px solid #888',borderRadius:3,padding:'0 3px',fontSize:9,fontWeight:700,color:'#888'}}>2</span>
                      <span style={{fontSize:14,color:'#888'}}>⋯</span>
                    </div>
                    <div className="flex-1 overflow-hidden bg-white">
                      {previewMode==='live'?<iframe src={fullUrl} className="w-full h-full border-0" style={{pointerEvents:isDragging?'none':'auto'}} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview"/>:<div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-500 text-sm">{previewMode} mode</div>}
                    </div>
                    <div className="flex items-center justify-around shrink-0" style={{height:44,background:'#f8f8f8',borderTop:'1px solid #e0e0e0',fontSize:16,color:'#888'}}>◁ ○ </div>
                  </div>
                  <div className="absolute z-20" style={{width:134,height:5,borderRadius:3,background:'rgba(255,255,255,.15)',bottom:8,left:'50%',transform:'translateX(-50%)'}}/>
                </div>
                <div className="text-center mt-2 font-mono text-[9px] text-zinc-600">{d.label} · {screenW}×{screenH} @{d.dpr}x</div>
              </div>
            )}
            {d.type==='desktop'&&(
              <div>
                <div style={{width:screenW,height:screenH,border:'2px solid #222',borderRadius:10,background:'#111',overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,.5)'}}>
                  <div className="flex items-center" style={{height:30,background:'#1a1a1a',borderBottom:'1px solid #333',padding:'0 12px',gap:8}}>
                    <div className="flex gap-1.5">{['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}</div>
                    <div className="flex-1 bg-[#0d0d0d] rounded-md px-3 py-1 text-[9px] text-zinc-500 font-mono mx-3"> {baseUrl.replace('https://','')}{currentRoute}</div>
                  </div>
                  <div style={{width:screenW,height:screenH-30,overflow:'hidden'}}><iframe src={fullUrl} className="w-full h-full border-0" style={{pointerEvents:isDragging?'none':'auto'}} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview"/></div>
                </div>
                <div className="text-center mt-2 font-mono text-[9px] text-zinc-600">{d.label} · {screenW}×{screenH}</div>
              </div>
            )}
            {d.type==='tablet'&&(
              <div>
                <div style={{width:screenW+32,height:screenH+32,border:'16px solid #1c1c1e',borderRadius:24,boxShadow:'inset 0 0 0 2px #3a3a3c,0 0 0 2px #3a3a3c,0 20px 50px rgba(0,0,0,.5)',background:'#000',overflow:'hidden'}}>
                  <div className="flex flex-col" style={{width:screenW,height:screenH,overflow:'hidden'}}>
                    <div className="shrink-0" style={{height:d.safeT,background:'#0a0e12'}}/>
                    <div className="flex-1 overflow-hidden"><iframe src={fullUrl} className="w-full h-full border-0" style={{pointerEvents:isDragging?'none':'auto'}} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview"/></div>
                  </div>
                </div>
                <div className="text-center mt-2 font-mono text-[9px] text-zinc-600">{d.label} · {screenW}×{screenH}</div>
              </div>
            )}
          </div>
        </div>

        {/* Console */}
        {consoleOpen&&(
          <div className="border-t border-zinc-800 bg-[#0a0a0d] max-h-20 overflow-y-auto shrink-0">
            {[{type:'ERR',msg:"TypeError: Cannot read 'email' of undefined",file:'checkout:247',c:'239,68,68'},{type:'WRN',msg:'Missing key prop in list',file:'MedList:89',c:'234,179,8'},{type:'INF',msg:'Stripe.js loaded — test mode',file:'stripe:1',c:'6,182,212'}].map((e,i)=>(
              <div key={i} className="flex items-start gap-1.5 px-2.5 py-1 text-[8px] font-mono border-b border-zinc-900/50" style={{background:`rgba(${e.c},.02)`}}>
                <span className="text-[6px] font-bold px-1 py-0.5 rounded shrink-0" style={{background:`rgba(${e.c},.1)`,color:`rgb(${e.c})`}}>{e.type}</span>
                <span className="flex-1 text-zinc-400">{e.msg}</span><span className="text-zinc-600 shrink-0">{e.file}</span>
              </div>
            ))}
          </div>
        )}
        {/* Footer */}
        <div className="flex gap-3 px-2.5 py-1 border-t border-zinc-800 bg-[#050507] text-[7px] font-mono text-zinc-500 shrink-0">
          <span>Device: <span className="text-zinc-300">{d.label}</span></span>
          <span>Screen: <span className="text-zinc-300">{screenW}×{screenH}</span></span>
          <span>DPR: <span className="text-zinc-300">{d.dpr}x</span></span>
          <span>Env: <span className={env==='production'?'text-emerald-400':'text-yellow-400'}>{env}</span></span>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      {rightOpen&&(
      <div className="w-[300px] bg-[#0d0d10] border-l border-zinc-800 flex flex-col shrink-0">
        <div className="flex border-b border-zinc-800 shrink-0">
          {([['inspect',''],['measure',''],['shots',''],['a11y','']] as [string,string][]).map(([id,icon])=>(
            <button key={id} onClick={()=>setRightTab(id as RightTab)} className={`flex-1 py-1.5 text-center border-b-2 text-[7px] font-bold uppercase tracking-widest cursor-pointer transition-all ${rightTab===id?'text-purple-400 border-purple-400 bg-purple-400/[.02]':'text-zinc-600 border-transparent hover:text-zinc-400'}`}>{icon} {id}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:'#3f3f46 transparent'}}>

          {/* INSPECT */}
          {rightTab==='inspect'&&(
            <div>
              <div className="flex gap-1 px-2.5 py-1 border-b border-zinc-800 text-[7px] font-mono overflow-x-auto">
                {['body','main','div.container','section.hero'].map((bc,i,a)=>(
                  <React.Fragment key={i}><span className={`${i===a.length-1?'text-purple-400 font-bold':'text-zinc-600'} cursor-pointer hover:text-purple-300`}>{bc}</span>{i<a.length-1&&<span className="text-zinc-700">›</span>}</React.Fragment>
                ))}
              </div>
              <div className="px-2.5 py-1.5 bg-purple-500/[.02] border-b border-zinc-800">
                <div className="font-mono text-[9px] text-purple-400 font-bold">&lt;section class=&quot;hero&quot;&gt;</div>
                <div className="font-mono text-[7px] text-zinc-500 mt-0.5">430 × 220 at (0, 54)</div>
              </div>
              {/* Box model */}
              <div className="m-2.5 border-2 border-dashed border-orange-500/25 bg-orange-500/[.02] p-1 rounded relative">
                <span className="absolute top-0 left-0.5 text-[5px] font-mono font-bold text-orange-400">margin</span>
                <div className="border-2 border-yellow-500/25 bg-yellow-500/[.02] p-1 rounded relative">
                  <div className="border-2 border-emerald-500/25 bg-emerald-500/[.02] p-1 rounded relative">
                    <span className="absolute top-0 left-0.5 text-[5px] font-mono font-bold text-emerald-400">padding</span>
                    <div className="text-center font-mono text-[7px] font-bold text-blue-400">
                      <div className="text-emerald-400 text-[6px]">40</div>
                      <div className="flex items-center justify-center gap-2"><span className="text-emerald-400 text-[6px]">24</span><span className="bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">382 × 140</span><span className="text-emerald-400 text-[6px]">24</span></div>
                      <div className="text-emerald-400 text-[6px]">40</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* CSS Props */}
              {[{s:'Layout',p:[['Display','flex'],['Width','100%'],['Height','auto'],['Position','relative'],['Flex-Dir','column'],['Justify','center'],['Align','center']]},
                {s:'Spacing',p:[['Pad T','40px'],['Pad R','24px'],['Pad B','40px'],['Pad L','24px'],['Mar T','0'],['Mar B','0']]},
                {s:'Typography',p:[['Size','20px'],['Weight','800'],['Line-H','1.4'],['Color','#ffffff']]},
                {s:'Border',p:[['Radius','0px'],['Width','0px'],['Style','none']]},
                {s:'Effects',p:[['Shadow','none'],['Opacity','1']]}
              ].map(g=>(
                <div key={g.s}>
                  <div className="px-2.5 py-1 text-[6px] font-bold text-zinc-500 uppercase border-t border-zinc-800 mt-1">{g.s}</div>
                  {g.p.map(([l,v])=>(
                    <div key={l} className="flex items-center gap-1 px-2.5 py-0.5">
                      <label className="text-[6px] text-zinc-500 font-bold w-10 text-right uppercase shrink-0">{l}</label>
                      <input defaultValue={v} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[8px] text-zinc-300 font-mono outline-none focus:border-purple-500/30"/>
                    </div>
                  ))}
                </div>
              ))}
              {/* Tailwind chips */}
              <div className="px-2.5 py-2 border-t border-zinc-800">
                <div className="text-[6px] font-bold text-zinc-500 uppercase mb-1">Tailwind</div>
                <div className="flex flex-wrap gap-1">{['bg-gradient-to-br','from-slate-900','to-slate-800','px-6','py-10','text-center','text-white','font-extrabold'].map(c=>(
                  <span key={c} className="px-1.5 py-0.5 bg-purple-500/5 border border-purple-500/15 rounded text-[7px] font-mono text-purple-300">{c}</span>
                ))}</div>
              </div>
            </div>
          )}

          {/* MEASURE */}
          {rightTab==='measure'&&(
            <div className="p-2.5 space-y-1.5">
              {[{n:'section.hero',c:'#00ffcc',w:393,h:220,y:54},{n:'section.services',c:'#ff6b6b',w:393,h:260,y:274},{n:'div.checkout-form',c:'#ffd93d',w:393,h:160,y:534},{n:'nav.bottom-nav',c:'#6bcbff',w:393,h:44,y:694}].map((m,i)=>(
                <div key={i} className="flex items-center gap-2 p-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{background:m.c}}/>
                  <div><div className="text-[9px] font-bold text-zinc-200">{m.n}</div><div className="text-[7px] text-zinc-500 font-mono">W:{m.w} H:{m.h} Y:{m.y}</div></div>
                </div>
              ))}
              <button onClick={()=>toast('Scanned','4 sections found','success')} className="w-full py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[8px] font-bold text-purple-400 mt-2"> Auto-Scan</button>
            </div>
          )}

          {/* SHOTS */}
          {rightTab==='shots'&&(
            <div className="p-2.5">
              <div className="flex gap-1 mb-2">
                <button onClick={()=>toast('Captured','Screenshot saved','success')} className="flex-1 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[8px] font-bold text-purple-400"> Capture</button>
                <button className="flex-1 py-1.5 border border-zinc-800 rounded-lg text-[8px] font-bold text-zinc-500">Batch All</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[{n:'Checkout',d:'iPhone 15 Pro',t:'Now'},{n:'Checkout',d:'iPhone SE',t:'2m',diff:'2.4%',bad:true},{n:'Landing',d:'iPhone 15',t:'5m'},{n:'Success',d:'Desktop',t:'10m',diff:'0.1%',bad:false}].map((s,i)=>(
                  <div key={i} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <div className="w-full h-12 bg-zinc-800 rounded flex items-center justify-center text-zinc-600 text-[12px] relative">
                      {s.diff&&<span className={`absolute top-0.5 right-0.5 text-[5px] font-bold px-1 rounded ${s.bad?'bg-red-500/10 text-red-400':'bg-emerald-500/10 text-emerald-400'}`}>{s.diff}</span>}
                    </div>
                    <div className="text-[8px] font-bold text-zinc-300 mt-1">{s.n}</div>
                    <div className="text-[6px] text-zinc-500">{s.d} · {s.t}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A11Y */}
          {rightTab==='a11y'&&(
            <div>
              <div className="flex justify-between items-center px-2.5 py-1.5 border-b border-zinc-800">
                <span className="text-[10px] font-bold">Accessibility</span>
                <button onClick={()=>toast('Audit','2 fails, 4 warns, 6 passes','success')} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[7px] font-bold text-purple-400">▶ Run</button>
              </div>
              {[
                {s:'PASS',t:'Image alt text',d:'All 3 images have alt attributes'},
                {s:'PASS',t:'Heading hierarchy',d:'h1 → h2 sequence correct'},
                {s:'PASS',t:'Interactive elements',d:'All buttons named'},
                {s:'PASS',t:'Language attribute',d:'<html lang="en"> present'},
                {s:'PASS',t:'Tab order',d:'Logical order maintained'},
                {s:'PASS',t:'Semantic HTML',d:'Proper sections & nav'},
                {s:'WARN',t:'Color contrast',d:'CTA 4.2:1 (AA ok, AAA fail)'},
                {s:'WARN',t:'Touch target size',d:'"Login" 32×24px, need 44×44'},
                {s:'WARN',t:'Focus indicators',d:'3 elements missing :focus'},
                {s:'WARN',t:'Form labels',d:'Email uses placeholder only'},
                {s:'FAIL',t:'Skip navigation',d:'No skip-to-content link'},
                {s:'FAIL',t:'ARIA landmark',d:'<main> element missing'},
              ].map((a,i)=>(
                <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 border-b border-zinc-900/50">
                  <span className={`text-[5px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${a.s==='PASS'?'bg-emerald-500/10 text-emerald-400':a.s==='WARN'?'bg-yellow-500/10 text-yellow-400':'bg-red-500/10 text-red-400'}`}>{a.s}</span>
                  <div><div className="text-[9px] font-semibold text-zinc-200">{a.t}</div><div className="text-[7px] text-zinc-500">{a.d}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ══════════ TOASTS ══════════ */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1.5" style={{pointerEvents:'none'}}>
        {toasts.map(t=>(
          <div key={t.id} className="px-3 py-2 rounded-lg border shadow-xl text-[10px] font-bold animate-[slideIn_0.2s_ease] backdrop-blur-xl" style={{pointerEvents:'auto',
            background:t.type==='success'?'rgba(34,197,94,.1)':t.type==='error'?'rgba(239,68,68,.1)':'rgba(59,130,246,.1)',
            borderColor:t.type==='success'?'rgba(34,197,94,.2)':t.type==='error'?'rgba(239,68,68,.2)':'rgba(59,130,246,.2)',
            color:t.type==='success'?'#4ade80':t.type==='error'?'#f87171':'#60a5fa'}}>
            {t.type==='success'?'✓':t.type==='error'?'':'ℹ'} {t.title} <span className="font-normal text-zinc-400 ml-1">{t.msg}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
