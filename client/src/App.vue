<script setup>
  import { RouterLink, RouterView } from 'vue-router';
  import { useGlobalStore } from '@/stores/globalStore';
  import Navbar from './components/Navbar.vue';
  import Footer from './components/Footer.vue';
  
  // 1. Import your theme switcher handler and the new widget
  import { useTheme } from './stores/useTheme'; 
  import ImeemWidget from './components/ImeemWidget.vue';

  const globalStore = useGlobalStore();

  // 2. Initialize the global theme and extract the current theme state
  const { currentTheme, initTheme } = useTheme();
  initTheme();
</script>

<template>
  <Navbar />
  
  <main class="app-main">
    <RouterView /> 
  </main>
  
  <Footer />

  <ImeemWidget :currentTheme="currentTheme" />
</template>

<style scoped>
.app-main {
  /* #nav in main.css is position: fixed with ~2rem vertical padding,
     so it floats out of normal flow. Routed pages need this offset or
     their first element renders underneath the navbar. */
  padding-top: 130px;
}
</style>