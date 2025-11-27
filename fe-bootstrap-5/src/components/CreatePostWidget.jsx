import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'
import { DEFAULT_AVATAR } from '../lib/placeholders'

export default function CreatePostWidget({ onPostCreated }){
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [text, setText] = useState('')
  const [privacy, setPrivacy] = useState('PUBLIC')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)

  const open = ()=>{
    setShow(true)
    // focus will be handled in modal when rendered
    setTimeout(()=>{ textareaRef.current?.focus() }, 50)
  }
  const close = ()=>{
    setShow(false)
    setText('')
    setPrivacy('PUBLIC')
  }

  const submit = async ()=>{
    if(!text.trim()) return
    setSubmitting(true)
    try{
      const payload = {
        text_content: text,
        privacy_setting: privacy,
        author_id: user?.user_id || user?.id || null,
        author_type: 'USER',
      }
      await postService.createPost(payload)
      // notify parent to reload
      if(typeof onPostCreated === 'function') onPostCreated()
      close()
    }catch(e){
      alert('Post failed')
    }finally{ setSubmitting(false) }
  }

  return (
    <>
      <div className="card shadow-sm mb-4">
        <div className="card-body d-flex align-items-center">
          <img src={user?.profile_picture_url || DEFAULT_AVATAR} alt="avatar" className="rounded-circle me-2" style={{width:40,height:40,objectFit:'cover'}} />
          <div className="flex-grow-1">
            <div className="p-2 bg-light rounded-pill" style={{cursor:'pointer'}} onClick={open}>
              What's on your mind, {user?.first_name || user?.name || 'there'}?
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between">
          <button className="btn btn-sm btn-light"><i className="bi bi-camera-video-fill text-danger me-1"></i> Live Video</button>
          <button className="btn btn-sm btn-light"><i className="bi bi-image text-success me-1"></i> Photo/Video</button>
          <button className="btn btn-sm btn-light"><i className="bi bi-emoji-smile text-warning me-1"></i> Feeling/Activity</button>
        </div>
      </div>

      {/* Modal */}
      {show && (
        <div className="modal d-block" tabIndex={-1} role="dialog" style={{background:'rgba(0,0,0,0.4)'}}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Post</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={close}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center mb-3">
                  <img src={user?.profile_picture_url || DEFAULT_AVATAR} alt="avatar" className="rounded-circle me-2" style={{width:40,height:40,objectFit:'cover'}} />
                  <div>
                    <div className="fw-bold">{user?.first_name || user?.name || user?.email}</div>
                    <div className="mt-1">
                      <select className="form-select form-select-sm" value={privacy} onChange={e=>setPrivacy(e.target.value)}>
                        <option value="PUBLIC">Public</option>
                        <option value="FRIENDS">Friends</option>
                        <option value="ONLY_ME">Only me</option>
                      </select>
                    </div>
                  </div>
                </div>
                <textarea ref={textareaRef} className="form-control border-0" rows={6} placeholder={`What's on your mind, ${user?.first_name || 'there'}?`} value={text} onChange={e=>setText(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={close} disabled={submitting}>Cancel</button>
                <button className="btn btn-primary" onClick={submit} disabled={submitting || !text.trim()}>
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
