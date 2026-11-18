import { Navigate, Route, Routes } from 'react-router-dom';
import { AppBar, Container, Toolbar, Typography } from '@mui/material';
import VideoChooser from './pages/VideoChooser.jsx';
import Preview from './pages/Preview.jsx';

export default function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Centroid Finder</Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/videos" replace />} />
          <Route path="/videos" element={<VideoChooser />} />
          <Route path="/preview/:filename" element={<Preview />} />
          <Route path="*" element={<Navigate to="/videos" replace />} />
        </Routes>
      </Container>
    </>
  );
}