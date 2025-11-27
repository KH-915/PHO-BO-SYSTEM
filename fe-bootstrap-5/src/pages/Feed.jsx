import React, { useEffect, useState } from 'react'
import postService from '../services/postService'
import { useAuth } from '../contexts/AuthContext'
import RightSidebar from '../components/RightSidebar'
import CreatePostWidget from '../components/CreatePostWidget'
import PostCard from '../components/PostCard'

export default function Feed(){
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async ()=>{
    setLoading(true)
    try{
      const res = await postService.getFeed({ limit: 10 })
      setPosts(res.data?.data || res.data || [])
    }catch(e){
      console.error(e)
    }finally{setLoading(false)}
  }

  useEffect(()=>{ load() },[])
  return (
    <div className="row">
      <div className="col-12 col-md-8">
        <CreatePostWidget onPostCreated={load} />
        {loading ? <div>Loading...</div> : (
          posts.length === 0 ? <div className="text-center text-muted">You're all caught up!</div> : posts.map((p, idx) => (
            <PostCard
              key={`post-${p.post_id ?? p.id ?? idx}`}
              post={p}
              onUpdated={load}
              currentUserAvatar={user?.avatar}
              currentUserId={user?.user_id || user?.id}
            />
          ))
        )}
      </div>
      <div className="col-12 col-md-4">
        <RightSidebar />
      </div>
    </div>
  )
}
