<script setup>
import { onMounted } from 'vue';
import Hero from '@/components/Hero.vue';
import Gallery from '@/components/Gallery.vue';
import ThemeSwitch from '@/components/ThemeSwitch.vue';
import Subscription from '@/components/Subscription.vue';
import About from '@/components/About.vue';
import Contact from '@/components/Contact.vue';

// Global theme switcher logic adapted from your script tags
const setTheme = (name) => {
  const themeLink = document.getElementById('theme-css');
  if (!themeLink) {
    // Create the link tag if it doesn't exist yet
    const link = document.createElement('link');
    link.id = 'theme-css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  
  document.getElementById('theme-css').href = (name === 'default') ? '/index.css' : `/${name}.css`;
  localStorage.setItem('mih-theme', name);
  
  // Dispatch a custom event so other components (like Navbar/Callout) can update their active states
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: name }));
};

onMounted(() => {
  const saved = localStorage.getItem('mih-theme') || 'default';
  setTheme(saved);
});
</script>

<template>
  <div class="home-wrapper">
    <Hero />
    <Gallery />
    <ThemeSwitch @set-theme="setTheme" />
    <Subscription />
    <About />
    <Contact />
  </div>
</template>