const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeVideo, normalizeYouTubeId } = require('../src/controllers/videoController');

const admin = { user_id: 7 };

test('normalizes supported YouTube URL formats to an 11-character ID', () => {
  assert.equal(normalizeYouTubeId('abcdefghijk'), 'abcdefghijk');
  assert.equal(normalizeYouTubeId('https://youtu.be/abcdefghijk?t=10'), 'abcdefghijk');
  assert.equal(normalizeYouTubeId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  assert.equal(normalizeYouTubeId('https://youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  assert.equal(normalizeYouTubeId('ftp://youtu.be/abcdefghijk'), '');
  assert.equal(normalizeYouTubeId('https://example.com/watch?v=abcdefghijk'), '');
});

test('validates required video fields and normalizes active state and admin ownership', () => {
  const valid = normalizeVideo({
    title: '  New Showcase Video ',
    type: 'youtube',
    videoId: 'https://youtu.be/abcdefghijk',
    active: false
  }, admin);
  assert.equal(valid.error, undefined);
  assert.deepEqual(valid.video, {
    title: 'New Showcase Video',
    video_id: 'abcdefghijk',
    thumbnail: null,
    type: 'youtube',
    active: false,
    user_id: 7
  });

  assert.match(normalizeVideo({ title: ' ', type: 'youtube', videoId: 'abcdefghijk' }, admin).error, /title/i);
  assert.match(normalizeVideo({ title: 'Valid', type: 'youtube', videoId: 'invalid' }, admin).error, /youtube/i);
  assert.match(normalizeVideo({ title: 'Valid', type: 'custom', videoId: '/uploads/videos/invalid.mp4' }, admin).error, /upload/i);
  assert.match(normalizeVideo({ title: 'Valid', type: 'youtube', videoId: 'abcdefghijk', active: 'false' }, admin).error, /active/i);
});

test('accepts only owned uploaded paths or HTTPS thumbnail URLs', () => {
  const uploadedVideo = '/uploads/videos/123e4567-e89b-12d3-a456-426614174000.mp4';
  const valid = normalizeVideo({
    title: 'Uploaded video',
    type: 'custom',
    videoId: uploadedVideo,
    thumbnail: 'https://images.example.test/cover.jpg'
  }, admin);
  assert.equal(valid.error, undefined);
  assert.equal(valid.video.video_id, uploadedVideo);

  const invalid = normalizeVideo({
    title: 'Invalid thumbnail',
    type: 'youtube',
    videoId: 'abcdefghijk',
    thumbnail: 'javascript:alert(1)'
  }, admin);
  assert.match(invalid.error, /thumbnail/i);
});
