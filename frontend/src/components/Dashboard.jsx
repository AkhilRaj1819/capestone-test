import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  CircularProgress,
  Tooltip,
  Alert
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Visibility as VisibilityIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.token) {
      console.log('No user or token found, redirecting to login');
      navigate('/login');
      return;
    }
    
    fetchDocuments();
  }, [user, navigate]);

  const fetchDocuments = async () => {
    try {
      setError(null);
      console.log('Fetching documents with token:', user.token);
      
      const response = await axios.get('http://localhost:5001/api/documents', {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Documents fetched:', response.data);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        
        // Handle authentication errors
        if (error.response.status === 401) {
          console.log('Authentication error, logging out');
          toast.error('Your session has expired. Please log in again.');
          logout();
          navigate('/login');
          return;
        }
        
        setError(error.response.data.message || 'Error fetching documents');
        toast.error(`Error fetching documents: ${error.response.data.message}`);
      } else if (error.request) {
        // Network error
        console.error('Network error:', error.request);
        setError('Network error. Please check your connection and try again.');
        toast.error('Network error. Please check your connection and try again.');
      } else {
        // Other errors
        setError(error.message || 'An unexpected error occurred');
        toast.error(`Error: ${error.message || 'An unexpected error occurred'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('document', file);

    try {
      console.log('Uploading file:', file.name);
      console.log('With token:', user.token);
      
      const response = await axios.post('http://localhost:5001/api/documents/upload', formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout for uploads
      });
      
      console.log('Upload response:', response.data);
      setDocuments([...documents, response.data.document]);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        
        // Handle authentication errors
        if (error.response.status === 401) {
          console.log('Authentication error, logging out');
          toast.error('Your session has expired. Please log in again.');
          logout();
          navigate('/login');
          return;
        }
        
        setError(error.response.data.message || 'Error uploading document');
        toast.error(`Error uploading document: ${error.response.data.message}`);
      } else if (error.request) {
        // Network error
        console.error('Network error:', error.request);
        setError('Network error. Please check your connection and try again.');
        toast.error('Network error. Please check your connection and try again.');
      } else {
        // Other errors
        setError(error.message || 'An unexpected error occurred');
        toast.error(`Error: ${error.message || 'An unexpected error occurred'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (documentId) => {
    navigate(`/documents/${documentId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRetry = () => {
    setLoading(true);
    fetchDocuments();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Welcome, {user.username}!
          </Typography>
          <Button variant="outlined" color="primary" onClick={handleLogout}>
            Logout
          </Button>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleRetry} startIcon={<RefreshIcon />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ods,.ppt,.pptx,.odp"
              />
            </Button>
            {uploading && <CircularProgress size={24} />}
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Your Documents
          </Typography>
          <List>
            {documents.map((doc, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={doc.name}
                  secondary={new Date(doc.uploadedAt).toLocaleDateString()}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="View in Document Viewer">
                    <IconButton
                      edge="end"
                      aria-label="view"
                      onClick={() => handleViewDocument(doc._id)}
                      sx={{ mr: 1 }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Open in New Tab">
                    <IconButton
                      edge="end"
                      aria-label="open in new tab"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {documents.length === 0 && (
              <ListItem>
                <ListItemText primary="No documents uploaded yet" />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard;