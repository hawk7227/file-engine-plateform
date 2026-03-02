'use client'
import { useState, useCallback } from 'react'
import { supabase, getUser } from '@/lib/supabase'
import JSZip from 'jszip'

// ============================================
// TYPES
// ============================================

export interface UploadedFile {
  id: string
  name: string
  path: string
  content: string | null
  url: string | null
  type: FileCategory
  mimeType: string
  size: number
  preview?: string
  children?: UploadedFile[] // For zip contents
  duration?: number // For audio/video
  dimensions?: { width: number; height: number } // For images/video
}

export type FileCategory =
  | 'code'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'font'
  | 'data'
  | 'other'

export interface FileUploadState {
  files: UploadedFile[]
  uploading: boolean
  progress: number
  error: string | null
}

export interface UseFileUploadOptions {
  projectId: string
  maxFiles?: number
  maxSizeBytes?: number
  allowedTypes?: string[]
  onUploadComplete?: (file: UploadedFile) => void
  onError?: (error: string) => void
}

// ============================================
// FILE CLASSIFICATION — comprehensive
// ============================================

const CODE_EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.swift', '.kt', '.scala', '.php', '.lua', '.r', '.m', '.mm', '.zig', '.nim', '.ex', '.exs',
  '.css', '.scss', '.less', '.sass', '.styl', '.html', '.htm', '.xml', '.svg', '.json', '.jsonc',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.env.local', '.env.production',
  '.md', '.mdx', '.txt', '.rst', '.tex', '.log',
  '.sql', '.graphql', '.gql', '.prisma',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  '.dockerfile', '.dockerignore', '.gitignore', '.gitattributes', '.editorconfig',
  '.eslintrc', '.prettierrc', '.babelrc', '.tsconfig',
  '.vue', '.svelte', '.astro', '.njk', '.ejs', '.hbs', '.pug',
  '.wasm', '.wat', '.proto', '.thrift',
  '.tf', '.tfvars', '.hcl',
  '.lock', '.sum'
])

const IMAGE_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.tif',
  '.avif', '.heic', '.heif', '.jxl', '.raw', '.cr2', '.nef', '.arw', '.dng', '.psd', '.ai', '.eps',
  '.apng', '.cur'
])

const VIDEO_EXT = new Set([
  '.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.ogv', '.3gp',
  '.ts', // Note: .ts is also code — we check mimeType to disambiguate
  '.mts', '.m2ts', '.vob', '.mpg', '.mpeg'
])

const AUDIO_EXT = new Set([
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.opus', '.mid', '.midi',
  '.aiff', '.ape', '.ac3', '.amr', '.webm' // .webm can be audio too
])

const DOCUMENT_EXT = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.tsv',
  '.odt', '.ods', '.odp', '.rtf', '.pages', '.numbers', '.key', '.epub'
])

const ARCHIVE_EXT = new Set([
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.tar.gz', '.tar.bz2',
  '.tar.xz', '.jar', '.war', '.ear', '.apk', '.dmg', '.iso'
])

const FONT_EXT = new Set(['.ttf', '.otf', '.woff', '.woff2', '.eot'])

const DATA_EXT = new Set([
  '.sqlite', '.db', '.mdb', '.parquet', '.avro', '.feather', '.arrow',
  '.ndjson', '.jsonl', '.geojson'
])

// Admin-only sizes
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB for regular users
const ADMIN_MAX_SIZE = 500 * 1024 * 1024  // 500MB for admins (video/audio)

// ============================================
// HOOK
// ============================================

export function useFileUpload(options: UseFileUploadOptions) {
  const {
    projectId,
    maxFiles = 50,
    maxSizeBytes = DEFAULT_MAX_SIZE,
    allowedTypes,
    onUploadComplete,
    onError
  } = options

  const [state, setState] = useState<FileUploadState>({
    files: [],
    uploading: false,
    progress: 0,
    error: null
  })

  // ── File type detection ──
  const getFileCategory = useCallback((filename: string, mimeType?: string): FileCategory => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase()

    // Handle .ts ambiguity: check mimeType first
    if (ext === '.ts' && mimeType && (mimeType.includes('video') || mimeType.includes('mpeg'))) return 'video'

    if (CODE_EXT.has(ext)) return 'code'
    if (IMAGE_EXT.has(ext)) return 'image'
    if (VIDEO_EXT.has(ext) && ext !== '.ts') return 'video'
    if (AUDIO_EXT.has(ext)) return 'audio'
    if (DOCUMENT_EXT.has(ext)) return 'document'
    if (ARCHIVE_EXT.has(ext)) return 'archive'
    if (FONT_EXT.has(ext)) return 'font'
    if (DATA_EXT.has(ext)) return 'data'

    // Fallback: check mimeType
    if (mimeType) {
      if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return 'code'
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType.startsWith('video/')) return 'video'
      if (mimeType.startsWith('audio/')) return 'audio'
      if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('spreadsheet')) return 'document'
      if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive'
      if (mimeType.includes('font')) return 'font'
    }

    return 'other'
  }, [])

  // ── File readers ──
  const readAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }, [])

  const readAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [])

  const readAsArrayBuffer = useCallback((file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }, [])

  // ── ZIP handling ──
  const extractZip = useCallback(async (file: File): Promise<UploadedFile[]> => {
    const buffer = await readAsArrayBuffer(file)
    const zip = await JSZip.loadAsync(buffer)
    const children: UploadedFile[] = []

    const entries = Object.entries(zip.files).filter(([, f]) => !f.dir)
    let idx = 0
    for (const [path, zipFile] of entries) {
      // Skip OS junk files
      if (path.startsWith('__MACOSX') || path.includes('.DS_Store') || path.includes('Thumbs.db')) continue

      const ext = path.split('.').pop()?.toLowerCase() || ''
      const category = getFileCategory(path)
      let content: string | null = null
      let preview: string | undefined

      // Read text content for code files
      if (category === 'code' || category === 'data') {
        try {
          content = await zipFile.async('string')
        } catch {
          // Binary file in code extension — skip content
        }
      }

      // Generate preview for images
      if (category === 'image') {
        try {
          const blob = await zipFile.async('blob')
          preview = URL.createObjectURL(blob)
        } catch { }
      }

      children.push({
        id: `zip_${Date.now()}_${idx++}`,
        name: path.split('/').pop() || path,
        path,
        content,
        url: null,
        type: category,
        mimeType: guessMimeType(path),
        size: (zipFile as any)._data ? (zipFile as any)._data.uncompressedSize || 0 : 0,
        preview
      })
    }

    return children
  }, [getFileCategory, readAsArrayBuffer])

  // ── Get image dimensions ──
  const getImageDimensions = useCallback((dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => resolve({ width: 0, height: 0 })
      img.src = dataUrl
    })
  }, [])

  // ── Upload single file ──
  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    const user = await getUser()
    if (!user) { onError?.('Not authenticated'); return null }

    // Size check (admin gets higher limit)
    const effectiveMax = file.size > DEFAULT_MAX_SIZE ? ADMIN_MAX_SIZE : maxSizeBytes
    if (file.size > effectiveMax) {
      onError?.(`File too large: ${file.name} (max ${Math.round(effectiveMax / 1024 / 1024)}MB)`)
      return null
    }

    // Type check
    if (allowedTypes && !allowedTypes.some(t => file.type.includes(t) || file.name.endsWith(t))) {
      onError?.(`File type not allowed: ${file.name}`)
      return null
    }

    const category = getFileCategory(file.name, file.type)
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const storagePath = `${user.id}/${projectId}/${fileId}-${file.name}`

    let content: string | null = null
    let url: string | null = null
    let preview: string | undefined
    let children: UploadedFile[] | undefined
    let dimensions: { width: number; height: number } | undefined

    try {
      // ── Code files: read as text ──
      if (category === 'code' || category === 'data') {
        content = await readAsText(file)
      }

      // ── Images: preview + upload + dimensions ──
      if (category === 'image') {
        preview = await readAsBase64(file)
        dimensions = await getImageDimensions(preview)
        const { error: uploadError } = await supabase.storage.from('attachments').upload(storagePath, file)
        if (uploadError) throw uploadError
        url = supabase.storage.from('attachments').getPublicUrl(storagePath).data.publicUrl
      }

      // ── Video: upload to storage ──
      if (category === 'video') {
        const { error: uploadError } = await supabase.storage.from('attachments').upload(storagePath, file, {
          contentType: file.type || 'video/mp4'
        })
        if (uploadError) throw uploadError
        url = supabase.storage.from('attachments').getPublicUrl(storagePath).data.publicUrl
        // Try to get preview frame
        try {
          preview = await getVideoThumbnail(file)
        } catch { }
      }

      // ── Audio: upload to storage ──
      if (category === 'audio') {
        const { error: uploadError } = await supabase.storage.from('attachments').upload(storagePath, file, {
          contentType: file.type || 'audio/mpeg'
        })
        if (uploadError) throw uploadError
        url = supabase.storage.from('attachments').getPublicUrl(storagePath).data.publicUrl
      }

      // ── Archives: extract + upload ──
      if (category === 'archive') {
        if (file.name.endsWith('.zip')) {
          children = await extractZip(file)
        }
        // Also upload the raw archive
        const { error: uploadError } = await supabase.storage.from('attachments').upload(storagePath, file)
        if (uploadError) throw uploadError
        url = supabase.storage.from('attachments').getPublicUrl(storagePath).data.publicUrl
      }

      // ── Documents, fonts, other: upload to storage ──
      if (category === 'document' || category === 'font' || category === 'other') {
        const { error: uploadError } = await supabase.storage.from('attachments').upload(storagePath, file)
        if (uploadError) throw uploadError
        url = supabase.storage.from('attachments').getPublicUrl(storagePath).data.publicUrl

        // Try reading CSV/TSV as text
        if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.type.includes('text')) {
          try { content = await readAsText(file) } catch { }
        }
      }

      // Save to database
      await supabase.from('files').insert({
        project_id: projectId,
        user_id: user.id,
        name: file.name,
        path: storagePath,
        type: category,
        mime_type: file.type || guessMimeType(file.name),
        size: file.size,
        storage_url: url,
        has_content: !!content,
      }).select().single()

      const uploaded: UploadedFile = {
        id: fileId,
        name: file.name,
        path: storagePath,
        content,
        url,
        type: category,
        mimeType: file.type || guessMimeType(file.name),
        size: file.size,
        preview,
        children,
        dimensions
      }

      onUploadComplete?.(uploaded)
      return uploaded

    } catch (err: unknown) {
      console.error('[Upload Error]', err)
      onError?.(`Upload failed: ${file.name} — ${(err instanceof Error ? err.message : String(err))}`)
      return null
    }
  }, [projectId, maxSizeBytes, allowedTypes, getFileCategory, readAsText, readAsBase64, readAsArrayBuffer, extractZip, getImageDimensions, onUploadComplete, onError])

  // ── Upload multiple files ──
  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length > maxFiles) {
      onError?.(`Too many files (max ${maxFiles})`)
      return
    }

    setState(prev => ({ ...prev, uploading: true, progress: 0, error: null }))

    const uploaded: UploadedFile[] = []
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i])
      if (result) uploaded.push(result)
      setState(prev => ({ ...prev, progress: Math.round(((i + 1) / files.length) * 100) }))
    }

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...uploaded],
      uploading: false,
      progress: 100
    }))
  }, [maxFiles, uploadFile, onError])

  // ── Create zip from files ──
  const createZip = useCallback(async (files: { path: string; content: string }[], zipName?: string): Promise<Blob> => {
    const zip = new JSZip()
    for (const file of files) {
      zip.file(file.path, file.content)
    }
    return await zip.generateAsync({ type: 'blob' })
  }, [])

  // ── Download zip ──
  const downloadZip = useCallback(async (files: { path: string; content: string }[], zipName: string = 'project.zip') => {
    const blob = await createZip(files, zipName)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipName
    a.click()
    URL.revokeObjectURL(url)
  }, [createZip])

  // ── Remove file ──
  const removeFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }))
  }, [])

  // ── Clear all files ──
  const clearFiles = useCallback(() => {
    setState({ files: [], uploading: false, progress: 0, error: null })
  }, [])

  return {
    ...state,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
    createZip,
    downloadZip,
    extractZip,
    getFileCategory
  }
}

// ============================================
// VIDEO THUMBNAIL HELPER
// ============================================

function getVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 4) // Seek to 25% or 1s
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } else {
        reject(new Error('No canvas context'))
      }
      URL.revokeObjectURL(video.src)
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Video load failed'))
    }

    video.src = URL.createObjectURL(file)
  })
}

// ============================================
// MIME TYPE GUESSING
// ============================================

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    // Code
    js: 'application/javascript', jsx: 'text/jsx', ts: 'text/typescript', tsx: 'text/tsx',
    py: 'text/x-python', rb: 'text/x-ruby', go: 'text/x-go', rs: 'text/x-rust',
    java: 'text/x-java', c: 'text/x-c', cpp: 'text/x-c++src', h: 'text/x-c',
    css: 'text/css', scss: 'text/x-scss', less: 'text/x-less',
    html: 'text/html', htm: 'text/html', xml: 'text/xml', svg: 'image/svg+xml',
    json: 'application/json', yaml: 'text/yaml', yml: 'text/yaml', toml: 'text/toml',
    md: 'text/markdown', mdx: 'text/mdx', txt: 'text/plain', csv: 'text/csv',
    sql: 'text/x-sql', graphql: 'text/x-graphql', prisma: 'text/x-prisma',
    sh: 'text/x-shellscript', bash: 'text/x-shellscript',
    // Images
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', ico: 'image/x-icon', bmp: 'image/bmp', tiff: 'image/tiff',
    avif: 'image/avif', heic: 'image/heic', psd: 'image/vnd.adobe.photoshop',
    // Video
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mov: 'video/quicktime', wmv: 'video/x-ms-wmv', flv: 'video/x-flv', m4v: 'video/x-m4v',
    ogv: 'video/ogg', mpg: 'video/mpeg', mpeg: 'video/mpeg',
    // Audio
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
    aac: 'audio/aac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma', opus: 'audio/opus',
    mid: 'audio/midi', midi: 'audio/midi', aiff: 'audio/aiff',
    // Documents
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    zip: 'application/zip', tar: 'application/x-tar', gz: 'application/gzip',
    '7z': 'application/x-7z-compressed', rar: 'application/vnd.rar',
    // Fonts
    ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
    // Data
    sqlite: 'application/x-sqlite3', parquet: 'application/x-parquet',
  }
  return map[ext] || 'application/octet-stream'
}

export default useFileUpload
