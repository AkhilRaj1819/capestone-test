import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  TextField
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  NavigateNext,
  NavigateBefore,
  Download,
  OpenInNew,
  Refresh,
  Search,
  Highlight,
  Bookmark,
  FirstPage,
  LastPage
} from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'react-toastify';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const DocumentViewer = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfError(null);
      
      if (!user || !user.token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`http://localhost:5001/api/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      
      if (!response.data.document) {
        throw new Error('Document not found in response');
      }

      setDocument(response.data.document);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename) => {
    if (!filename) return 'unknown';
    const extension = filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['txt', 'md', 'json', 'csv'].includes(extension)) return 'text';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
    return 'unknown';
  };

  const renderContent = () => {
    if (!document) return null;

    const fileType = getFileType(document.name);

    switch (fileType) {
      case 'image':
        return (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img
              src={`http://localhost:5001/api/documents/${documentId}/download`}
              alt={document.name}
              style={{ maxWidth: '100%', height: 'auto', transform: `scale(${scale})` }}
            />
          </Box>
        );

      case 'pdf':
        const pdfFile = {
          url: `http://localhost:5001/api/documents/${documentId}/download`,
          httpHeaders: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline'
          },
          withCredentials: false
        };
        
        return (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<CircularProgress />}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ width: '100%', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <iframe
              src={`http://localhost:5001/api/documents/${documentId}/download`}
              style={{ width: '100%', height: '600px', border: 'none' }}
              title={document.name}
            />
          </Box>
        );

      default:
        return (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="body1" gutterBottom>
              Preview not available for this file type. Please download the file to view it.
            </Typography>
          </Box>
        );
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Document load error:', error);
    let errorMessage = 'Failed to load document.';
    setPdfError(errorMessage);
    setRetryCount(prev => prev + 1);
  };

  const handleRetry = () => {
    setPdfError(null);
    fetchDocument();
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 2.0));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  };

  const handleNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
      setCurrentSearchIndex(0);
    }
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
      setCurrentSearchIndex(0);
    }
  };

  const handleFirstPage = () => {
    setPageNumber(1);
    setCurrentSearchIndex(0);
  };

  const handleLastPage = () => {
    setPageNumber(numPages);
    setCurrentSearchIndex(0);
  };

  const handleSearch = async () => {
    if (!searchText || !document) return;
    
    try {
      const response = await axios.post(`http://localhost:5001/api/documents/${documentId}/search`, {
        text: searchText,
        page: pageNumber
      }, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      setSearchResults(response.data.results);
      setCurrentSearchIndex(0);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search document');
    }
  };

  const handleNextSearchResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
  };

  const handlePrevSearchResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prevIndex) => (prevIndex - 1 + searchResults.length) % searchResults.length);
  };

  const handleAddBookmark = () => {
    if (!bookmarks.some(b => b.page === pageNumber)) {
      setBookmarks([...bookmarks, { page: pageNumber, label: `Page ${pageNumber}` }]);
      toast.success('Bookmark added');
    }
  };

  const handleRemoveBookmark = (page) => {
    setBookmarks(bookmarks.filter(b => b.page !== page));
  };

  const handleDownload = () => {
    if (document?.url) {
      window.open(`http://localhost:5001/api/documents/${documentId}/download`, '_blank');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const fileType = document ? getFileType(document.name) : 'unknown';
  const showPagination = fileType === 'pdf' && numPages > 1;

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, my: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">
            {document?.name || 'Document Viewer'}
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Box>

        {pdfError ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography color="error" gutterBottom>
              {pdfError}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRetry}
              sx={{ mt: 2 }}
            >
              Retry Loading Document
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {showPagination && (
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography>
                  Page {pageNumber} of {numPages}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={handlePrevPage} disabled={pageNumber <= 1}>
                    <NavigateBefore />
                  </IconButton>
                  <IconButton onClick={handleNextPage} disabled={pageNumber >= numPages}>
                    <NavigateNext />
                  </IconButton>
                </Box>
              </Box>
            )}

            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <IconButton onClick={handleZoomIn} title="Zoom In">
                <ZoomIn />
              </IconButton>
              <IconButton onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut />
              </IconButton>
              <IconButton onClick={handleFirstPage} title="First Page" disabled={pageNumber <= 1}>
                <FirstPage />
              </IconButton>
              <IconButton onClick={handleLastPage} title="Last Page" disabled={pageNumber >= numPages}>
                <LastPage />
              </IconButton>
              <TextField
                size="small"
                placeholder="Search text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                sx={{ width: 200 }}
              />
              <IconButton onClick={handleSearch} title="Search">
                <Search />
              </IconButton>
              {searchResults.length > 0 && (
                <>
                  <IconButton onClick={handlePrevSearchResult} title="Previous match">
                    <NavigateBefore />
                  </IconButton>
                  <Typography>
                    {currentSearchIndex + 1}/{searchResults.length}
                  </Typography>
                  <IconButton onClick={handleNextSearchResult} title="Next match">
                    <NavigateNext />
                  </IconButton>
                </>
              )}
              <IconButton onClick={handleAddBookmark} title="Add bookmark">
                <Bookmark />
              </IconButton>
            </Box>

            {renderContent()}

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleDownload}
                startIcon={<Download />}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.open(`http://localhost:5001/api/documents/${documentId}/download`, '_blank')}
                startIcon={<OpenInNew />}
              >
                Open in New Tab
              </Button>
              {bookmarks.length > 0 && (
                <Box sx={{ ml: 2 }}>
                  <Typography variant="subtitle2">Bookmarks:</Typography>
                  {bookmarks.map((bookmark) => (
                    <Button
                      key={bookmark.page}
                      size="small"
                      onClick={() => setPageNumber(bookmark.page)}
                      endIcon={<IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBookmark(bookmark.page);
                      }}>✕</IconButton>}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      {bookmark.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default DocumentViewer;