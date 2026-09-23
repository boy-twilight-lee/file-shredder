export interface TableColumnData {
	type?: 'default' | 'selection' | 'index' | 'expand'
	index?: number | Function
	label?: string
	columnKey?: string
	prop?: string
	width?: number | string
	minWidth?: number | string
	fixed?: 'left' | 'right'
	renderHeader?: Function
	sortable?: boolean | string
	sortMethod?: Function
	sortBy?: Function | string | string[]
	sortOrders?: ('ascending' | 'descending' | null)[]
	resizable?: boolean
	formatter?: Function
	showOverflowTooltip?: boolean
	align?: 'left' | 'center' | 'right'
	className?: string
	labelClassName?: string
	selectable?: Function
	reserveSelection?: boolean
	filters?: Array<{ text: string; value: string }>
	filterPlacement?:
		| 'top'
		| 'top-start'
		| 'top-end'
		| 'bottom'
		| 'bottom-start'
		| 'bottom-end'
		| 'left'
		| 'left-start'
		| 'left-end'
		| 'right'
		| 'right-start'
		| 'right-end'
	filterMultiple?: boolean
	filterMethod?: Function
	filteredValue?: string[]
	tooltipFormatter?: Function
	children?: TableColumnData[]
}
