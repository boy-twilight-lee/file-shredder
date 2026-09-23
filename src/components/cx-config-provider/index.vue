<template>
	<a-config-provider :update-at-scroll="true">
		<slot />
		<template #empty>
			<a-empty class="form-emtpy">
				<template #image>
					<svg-icon name="form-empty" size="40" />
				</template>
			</a-empty>
		</template>
		<template #loading>
			<div style="display: flex; flex-direction: column; gap: 20px">
				<svg-icon name="icon-component-loading" size="36" />
			</div>
		</template>
	</a-config-provider>
</template>

<style lang="less" scoped>
.form-emtpy {
	margin-bottom: 0;
	&:deep(.arco-empty-image) {
		height: 40px;
		margin-bottom: 0;
	}
	&:deep(.arco-empty-description) {
		color: #c9ced6;
		font-size: 14px;
		line-height: 20px;
	}
}
</style>
