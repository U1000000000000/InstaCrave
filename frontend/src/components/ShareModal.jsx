import React from 'react';
import { FaWhatsapp, FaXTwitter, FaFacebook, FaEnvelope, FaLink, FaRedditAlien, FaPinterest, FaInstagram, FaLinkedin, FaBlogger } from 'react-icons/fa6';

const shareOptions = [
  {
    label: 'WhatsApp',
    icon: <FaWhatsapp style={{ color: '#25D366', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://wa.me/?text=${encodeURIComponent(meta?.message ? meta.message + ' ' + url : url)}`,
  },
  {
    label: 'X',
    icon: <FaXTwitter style={{ color: '#fff', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(meta?.message ? meta.message + ' ' + url : url)}`,
  },
  {
    label: 'Facebook',
    icon: <FaFacebook style={{ color: '#1877F3', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(meta?.message || '')}`,
  },
  {
    label: 'Email',
    icon: <FaEnvelope style={{ color: '#fff', fontSize: 28 }} />, 
    getUrl: (url, meta) => `mailto:?subject=${encodeURIComponent(meta?.subject || 'Check this out')}&body=${encodeURIComponent(meta?.message ? meta.message + '\n' + url : url)}`,
  },
  {
    label: 'Reddit',
    icon: <FaRedditAlien style={{ color: '#FF4500', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(meta?.subject || '')}`,
  },
  {
    label: 'Pinterest',
    icon: <FaPinterest style={{ color: '#E60023', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(meta?.message || '')}`,
  },
  {
    label: 'Instagram',
    icon: <FaInstagram style={{ color: '#E1306C', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://www.instagram.com/?url=${encodeURIComponent(url)}`,
  },
  {
    label: 'LinkedIn',
    icon: <FaLinkedin style={{ color: '#0077B5', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(meta?.message || '')}`,
  },
  {
    label: 'Blogger',
    icon: <FaBlogger style={{ color: '#FF8000', fontSize: 28 }} />, 
    getUrl: (url, meta) => `https://www.blogger.com/blog-this.g?u=${encodeURIComponent(url)}&n=${encodeURIComponent(meta?.subject || '')}&t=${encodeURIComponent(meta?.message || '')}`,
  },
];

const ShareModal = ({ open, onClose, shareUrl, onCopy, copied, meta }) => {
  if (!open) return null;
  return (
    <div
      className="comments-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(30,30,32,0.35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        transition: 'background 0.3s',
      }}
    >
      <div
        className="comments-modal"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#18181b',
          borderRadius: '18px 18px 0 0',
          height: '75vh',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          zIndex: 10000,
          padding: 0,
          marginBottom: 0,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '16px 0 8px 0',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '1.1rem',
          position: 'relative',
          borderBottom: '1px solid #27272a',
        }}>
          <span>Share</span>
          <button
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            padding: '32px 0 12px 0',
            justifyItems: 'center',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          {shareOptions.map(opt => (
            <a
              key={opt.label}
              href={opt.getUrl(shareUrl, meta)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 60,
                marginBottom: 18,
                width: '100%',
              }}
            >
              {opt.icon}
              <span style={{ fontSize: 13, marginTop: 6 }}>{opt.label}</span>
            </a>
          ))}
        </div>
        <div style={{ marginTop: 'auto', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#232326', borderRadius: 12, margin: '0 18px', padding: '10px 12px', gap: 10 }}>
            <FaLink style={{ fontSize: 20, color: '#fff' }} />
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 15, outline: 'none' }}
            />
            <button
              onClick={onCopy}
              style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
