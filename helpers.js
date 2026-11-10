(function () {
  window.FlowSmith = {
    uid: () => 'n' + Math.random().toString(36).slice(2, 9),
    defaultColors: () => ({
      fill: '#ffffff',
      stroke: '#3b82f6'
    }),
    humanSize(bytes) {
      if (bytes < 1024) return bytes + ' B';

      const kb = bytes / 1024;
      if (kb < 1024) return kb.toFixed(1) + ' KB';

      return (kb / 1024).toFixed(1) + ' MB';
    },
    toColor(value) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.fillStyle = value;
      return context.fillStyle;
    }
  };
})();