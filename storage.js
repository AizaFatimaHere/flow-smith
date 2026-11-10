(function () {
  const nodesKey = 'wf:nodes';
  const edgesKey = 'wf:edges';

  window.readWorkflow = function () {
    try {
      return {
        nodes: JSON.parse(localStorage.getItem(nodesKey)) || [],
        edges: JSON.parse(localStorage.getItem(edgesKey)) || []
      };
    } catch (error) {
      return {
        nodes: [],
        edges: []
      };
    }
  };

  window.saveWorkflow = function (nodes, edges) {
    try {
      localStorage.setItem(nodesKey, JSON.stringify(nodes));
      localStorage.setItem(edgesKey, JSON.stringify(edges));
    } catch (error) {
      console.warn('Could not save the workflow in this browser.');
    }
  };
})();