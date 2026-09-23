<template>
	<el-table-column
		:type="type"
		:index="<any>index"
		:label="label"
		:columnKey="columnKey"
		:prop="prop"
		:width="width"
		:min-width="minWidth"
		:fixed="fixed"
		:renderHeader="<any>renderHeader"
		:sortable="sortable"
		:sortMethod="<any>sortMethod"
		:sortBy="<any>sortBy"
		:sortOrders="sortOrders"
		:resizable="resizable"
		:formatter="<any>formatter"
		:showOverflowTooltip="<any>showOverflowTooltip"
		:align="<any>align"
		:class-name="className"
		:labelClassName="labelClassName"
		:selectable="<any>selectable"
		:reserveSelection="reserveSelection"
		:filters="filters"
		:filterPlacement="filterPlacement"
		:filterMultiple="filterMultiple"
		:filter-method="<any>filterMethod"
		:filtered-value="filteredValue"
		:tooltipFormatter="<any>tooltipFormatter"
	>
		<!-- default -->
		<template #default="scope">
			<slot v-if="$slots.default" name="default" v-bind="scope" />
		</template>
		<!-- header -->
		<template #header="scope">
			<slot v-if="$slots.header" name="header" v-bind="scope" />
		</template>
		<!-- filter-icon -->
		<template #filter-icon="scope">
			<slot v-if="$slots['filter-icon']" name="filter-icon" v-bind="scope" />
		</template>
	</el-table-column>
</template>

<script lang="ts" setup>
import { TableColumnData } from './type'
withDefaults(defineProps<TableColumnData>(), {
	showOverflowTooltip: true
})
</script>
