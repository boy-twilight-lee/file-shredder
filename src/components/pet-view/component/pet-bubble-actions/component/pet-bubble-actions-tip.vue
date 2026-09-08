<template>
  <footer class="pet-bubble-actions-tip">
    <span class="pet-bubble-actions-tip-icon">
      <svg-icon name="app-heart" />
    </span>
    <span>小贴士：文件或文件夹也可以直接拖到我身上。</span>
  </footer>
</template>
<style lang="less" scoped>
.pet-bubble-actions-tip {
  margin-top: 12px;
  font-size: 10px;
  line-height: 1.5;
  color: #7c8693;
  display: flex;
  align-items: center;
  gap: 4px;
  .pet-bubble-actions-tip-icon {
    height: 18px;
    width: 18px;
    flex-shrink: 0;
    background: rgba(238, 109, 143, 0.1);
    border-radius: 50%;
    color: #ee6d8f;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    & > svg {
      font-size: 11px;
    }
  }
}
</style>
