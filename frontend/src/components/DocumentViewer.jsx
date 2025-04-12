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
  Alert
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  NavigateNext,
  NavigateBefore,
  Download,
  OpenInNew,
  Refresh
} from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'react-toastify';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

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

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    let errorMessage = 'Failed to load PDF document.';
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
    }
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
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
              Retry Loading PDF
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                <IconButton onClick={handleZoomIn}>
                  <ZoomIn />
                </IconButton>
                <IconButton onClick={handleZoomOut}>
                  <ZoomOut />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Document
                file={{
                  url: `http://localhost:5001/api/documents/${documentId}/download`,
                  httpHeaders: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'inline'
                  },
                  withCredentials: true
                }}
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
                onClick={() => window.open(document.url, '_blank')}
                startIcon={<OpenInNew />}
              >
                Open in New Tab
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default DocumentViewer;