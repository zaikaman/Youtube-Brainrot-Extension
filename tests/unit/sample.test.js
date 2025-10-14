// Example real unit test for URL validation in extension
const assert = require('assert');

function isYouTubeUrl(url) {
  const re = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu.be)\/[A-Za-z0-9._%+-]+/;
  return re.test(url);
}

describe('isYouTubeUrl', function() {
  it('should return true for valid YouTube URLs', function() {
    const good = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'http://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ];
    good.forEach(u => {
      if (!isYouTubeUrl(u)) throw new Error('Failed for ' + u);
    });
  });
  it('should return false for non-YouTube URLs', function() {
    const bad = [
      'https://example.com',
      'https://vimeo.com/12345',
      'ftp://youtube.com/watch?v=dQw4w9WgXcQ'
    ];
    bad.forEach(u => {
      if (isYouTubeUrl(u)) throw new Error('Should fail for ' + u);
    });
  });
});
