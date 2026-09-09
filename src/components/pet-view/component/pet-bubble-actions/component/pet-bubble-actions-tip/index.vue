<template>
  <div class="pet-bubble-actions-tip">
    <span class="pet-bubble-actions-tip-icon">
      <svg-icon
        class="pet-bubble-actions-tip-heart"
        name="app-heart"
      />
    </span>
    <span>小贴士：文件或文件夹也可以直接拖到我身上。</span>
  </div>
</template>
<style lang="less" scoped>
.pet-bubble-actions-tip {
  margin-top: 12px;
  font-size: 10px;
  line-height: 16px;
  color: #7c8693;
  display: flex;
  align-items: center;
  gap: 4px;
  .pet-bubble-actions-tip-icon {
    height: 18px;
    width: 18px;
    background: rgba(238, 109, 143, 0.1);
    border-radius: 50%;
    color: #ee6d8f;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    .pet-bubble-actions-tip-heart {
      font-size: 12px;
    }
  }
}
</style>
