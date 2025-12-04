import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import pageService from '../services/pageService'
import Swal from 'sweetalert2'
import { useAuth } from '../contexts/AuthContext'

export default function PageList() {
  const [activeTab, setActiveTab] = useState('discover') // discover, my-pages
  const [allPages, setAllPages] = useState([])
  const [myPages, setMyPages] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = async () => {
    setLoading(true)
    try {
      const [allRes, myRes] = await Promise.all([
        pageService.getAllPages(),
        pageService.getMyPages()
      ])
      setAllPages(allRes.data || [])
      setMyPages(myRes.data || [])
    } catch (error) {
      console.error('Error loading pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePage = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Page',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label for="page-name" class="form-label fw-bold">Page Name *</label>
            <input id="page-name" class="form-control" placeholder="Enter page name" required>
          </div>
          
          <div class="mb-3">
            <label for="page-username" class="form-label fw-bold">Username (Optional)</label>
            <input id="page-username" class="form-control" placeholder="@username">
          </div>
          
          <div class="mb-3">
            <label for="page-category" class="form-label fw-bold">Category (Optional)</label>
            <select id="page-category" class="form-select">
              <option value="">Select category</option>
              <option value="Business">Business</option>
              <option value="Brand">Brand</option>
              <option value="Community">Community</option>
              <option value="Artist">Artist</option>
              <option value="Public Figure">Public Figure</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Non-profit">Non-profit</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div class="mb-3">
            <label for="page-description" class="form-label fw-bold">Description (Optional)</label>
            <textarea id="page-description" class="form-control" rows="3" placeholder="Tell people about your page"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Page',
      confirmButtonColor: '#0d6efd',
      width: '600px',
      preConfirm: () => {
        const pageName = document.getElementById('page-name').value.trim()
        const username = document.getElementById('page-username').value.trim()
        const category = document.getElementById('page-category').value
        const description = document.getElementById('page-description').value.trim()
        
        if (!pageName) {
          Swal.showValidationMessage('Page name is required')
          return false
        }
        
        return { pageName, username, category, description }
      }
    })

    if (formValues) {
      try {
        const pageData = {
          page_name: formValues.pageName,
          username: formValues.username || null,
          category: formValues.category || null,
          description: formValues.description || null,
        }
        
        const res = await pageService.createPage(pageData)
        
        await Swal.fire({
          icon: 'success',
          title: 'Page Created!',
          text: 'Your page has been created successfully.',
          timer: 2000,
          showConfirmButton: false
        })
        
        loadPages()
      } catch (error) {
        console.error('Error creating page:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.detail || 'Failed to create page'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary"></div>
      </div>
    )
  }

  const displayPages = activeTab === 'discover' ? allPages : myPages

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Pages</h2>
        <button className="btn btn-primary" onClick={handleCreatePage}>
          <i className="bi bi-plus-circle me-2"></i>Create Page
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            <i className="bi bi-compass me-2"></i>Discover
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'my-pages' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-pages')}
          >
            <i className="bi bi-flag-fill me-2"></i>My Pages
          </button>
        </li>
      </ul>

      {/* Pages Grid */}
      {displayPages.length === 0 ? (
        <div className="alert alert-info text-center">
          {activeTab === 'discover' 
            ? 'No pages available yet.' 
            : 'You haven\'t created or joined any pages yet.'}
        </div>
      ) : (
        <div className="row">
          {displayPages.map(page => (
            <div key={page.page_id} className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div 
                  className="card-img-top" 
                  style={{height: '150px', backgroundColor: '#dee2e6'}}
                ></div>
                <div className="card-body">
                  <h5 className="card-title">
                    <Link to={`/pages/${page.page_id}`} className="text-decoration-none text-dark">
                      {activeTab === 'my-pages' ? page.name : page.page_name}
                    </Link>
                  </h5>
                  {page.category && (
                    <p className="text-muted small mb-2">
                      <i className="bi bi-tag me-1"></i>{page.category}
                    </p>
                  )}
                  {page.description && (
                    <p className="card-text text-muted small">{page.description}</p>
                  )}
                  {activeTab === 'my-pages' && page.role && (
                    <span className="badge bg-primary">{page.role}</span>
                  )}
                </div>
                <div className="card-footer bg-white border-0">
                  <Link to={`/pages/${page.page_id}`} className="btn btn-outline-primary w-100">
                    View Page
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
