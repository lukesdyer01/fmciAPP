import { useState } from 'react'

export default function YouTubePreview({ videoId, title = 'YouTube video' }: { videoId: string; title?: string }) {
  const [playing, setPlaying] = useState(false)
  return playing ? <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} title={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <button type="button" aria-label={`Play ${title}`} onClick={() => setPlaying(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, cursor: 'pointer', background: '#000', color: '#fff' }}><img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /><span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 48 }}>▶</span></button>
}
