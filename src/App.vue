<template>
  <pet-view />
</template>

<script setup lang="ts">
import { PetView } from './components';

// 应用只保留桌宠渲染入口，设置与记录统一由桌宠气泡承载。
document.documentElement.dataset.appView = 'pet';
</script>
