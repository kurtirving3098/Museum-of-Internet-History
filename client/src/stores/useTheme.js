import { ref, watch } from 'vue';

// Read from localStorage on initial load, default to 'default'
const currentTheme = ref(localStorage.getItem('museum-theme') || 'default');

export function useTheme() {
  const setTheme = (themeName) => {
    currentTheme.value = themeName;
  };

  const initTheme = () => {
    // Watch for changes and update the DOM and localStorage automatically
    watch(currentTheme, (newTheme) => {
      localStorage.setItem('museum-theme', newTheme);
      
      let linkElement = document.getElementById('dynamic-theme');
      
      // If returning to default, just remove the injected stylesheet
      if (newTheme === 'default') {
        if (linkElement) linkElement.remove();
        return;
      }

      // If switching to a specific theme, create the link tag if it doesn't exist
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.id = 'dynamic-theme';
        linkElement.rel = 'stylesheet';
        document.head.appendChild(linkElement);
      }
      
      // Point the link tag to the file in the public directory
      linkElement.href = `/themes/${newTheme}.css`; 
    }, { immediate: true }); // immediate: true runs this immediately on app load
  };

  return { currentTheme, setTheme, initTheme };
}