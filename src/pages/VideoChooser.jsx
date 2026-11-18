import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { fetchVideos } from '../api.js';
import withStatus from '../hocs/withStatus.jsx';

function VideoList({ videos }) {
  if (videos.length === 0) return <Typography>No videos found.</Typography>;
  return (
    <List>
      {videos.map((name) => (
        <ListItemButton key={name} component={Link} to={`/preview/${encodeURIComponent(name)}`}>
          <ListItemText primary={name} />
        </ListItemButton>
      ))}
    </List>
  );
}

const VideoListWithStatus = withStatus(VideoList);

export default function VideoChooser() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVideos()
      .then((v) => !cancelled && setVideos(v))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Typography variant="h4" gutterBottom>Choose a video</Typography>
      <VideoListWithStatus videos={videos} loading={loading} error={error} />
    </>
  );
}