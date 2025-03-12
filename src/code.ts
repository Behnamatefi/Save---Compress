figma.showUI(__html__, { width: 320, height: 480 });

figma.ui.onmessage = msg => {
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};