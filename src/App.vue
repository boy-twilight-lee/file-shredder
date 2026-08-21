<script setup lang="ts">
import { PetView, SettingsView } from './components';

const view = new URLSearchParams(window.location.search).get('view') ?? 'pet';
</script>

<template>
  <pet-view v-if="view === 'pet'" />
  <settings-view v-else />
</template>
