<template>
  <div :class="cls" :style="tableStyles">
    <km-grid-item
      fixed="left"
      v-on="$listeners"
      :columns="fixedLeftCol"
      :header-styles="leftFixedHeaderStyles"
      :body-styles="leftFixedBodyStyles"
      v-if="fixedLeftCol&&fixedLeftCol.length"
    ></km-grid-item>
    <km-grid-item
      v-on="$listeners"
      :columns="centerCol"
      :expandColumn="expandCol"
      :header-styles="headerStyles"
      :body-styles="bodyStyles"
    ></km-grid-item>
    <km-grid-item
      fixed="right"
      v-on="$listeners"
      :columns="fixedRightCol"
      :header-styles="rightFixedHeaderStyles"
      :body-styles="rightFixedBodyStyles"
      v-if="fixedRightCol&&fixedRightCol.length"
    ></km-grid-item>
    <div
      :class="cls+'-drag-line'"
      :style="{height:height-1+'px',left:dragLineLeft+'px'}"
      v-show="isDragging"
    ></div>
    <div v-if="!data||!data.length" :class="cls+'-null-wrap'">
      <div :class="cls+'-null-wrap-text'">
        暂无数据
        <br />
        {{emptyText}}
      </div>
    </div>
  </div>
</template>
<script>
const cls = 'km-grid'

import KmGridItem from './km-grid-item'
import { on, off } from '../../utils/dom'
import { getScrollBarSize } from '../../utils/assist'

export default {
  name: 'KmGrid',
  components: { KmGridItem },
  data () {
    return {
      cls,
      columnsWidth: 0,
      tableWidth: 0,
      itemVms: [],
      isDragging: false,
      dragLineLeft: 0,
      minWidth: 50,
      scrollbarWidth: getScrollBarSize()
    }
  },
  props: {
    data: {
      type: Array,
      default: () => {
        return []
      }
    },
    columns: {
      type: Array,
      default: () => {
        return []
      }
    },
    headerRowHeight: {
      type: Number,
      default: 44
    },
    rowHeight: {
      type: Number,
      default: 40
    },
    totalRowHeight: {
      type: Number,
      default: 44
    },
    height: {
      type: [Number, String],
      default: 'auto'
    },
    width: {
      type: Number
    },
    border: {
      type: Boolean,
      default: false
    },
    pageSize: {
      type: Number,
      default: 10
    },
    current: {
      type: Number,
      default: 1
    },
    emptyText: {
      type: String,
      default: ''
    },
    clickAsync: {
      type: Boolean,
      default: false
    },
    draggable: {
      type: Boolean,
      default: true
    },
    auth: Object
  },
  created () {
    this.$on('on-km-grid-item-add', item => {
      this.itemVms.push(item);
    })
  },
  computed: {
    tableStyles () {
      let style = {}
      if (this.height) {
        style.height = this.height + 2
      }
      style.height += 'px'
      return style
    },
    isVScroll () {
      return this.headerRowHeight + (this.data ? this.data.length : 0) * this.rowHeight > this.height
    },
    isShowSumary () {
      return this.columns.some(v => v.total)
    },
    hasFixedRight () {
      return this.itemVms.some(v => v.fixed === 'right')
    },
    leftFixedHeaderStyles () {
      let style = {}
      if (this.height) {
        style.height = this.headerRowHeight + 'px'
      }
      style.width = this.fixedLeftColWidth + 'px'
      return style;
    },
    rightFixedHeaderStyles () {
      let style = {}
      if (this.height) {
        style.height = this.headerRowHeight + 'px'
      }
      style.width = this.fixedRightColWidth + 'px'
      return style;
    },
    headerStyles () {
      let style = {}
      if (this.height) {
        style.height = this.headerRowHeight + 'px'
      }
      if (this.isHScroll) {
        style.width = this.columnsWidth + this.scrollbarWidth + 'px'
      } else {
        style.width = '100%'
      }

      style.paddingLeft = this.fixedLeftColWidth + 'px'
      style.paddingRight = this.fixedRightColWidth + 'px'
      return style;
    },
    leftFixedBodyStyles () {
      let style = {}
      // if (!this.isVScroll) {
      //   style.height = this.rowHeight * (this.data ? this.data.length : 0)
      // } else {

      // }
      if (this.height) {
        style.height = Number(this.height) - this.headerRowHeight - (this.isShowSumary ? this.totalRowHeight : 0)
      }
      if (this.isHScroll) {
        style.height -= this.scrollbarWidth
      }
      style.height += 'px'
      style.width = this.fixedLeftColWidth + 'px'
      return style;
    },
    rightFixedBodyStyles () {
      let style = {}
      // if (!this.isVScroll) {
      //   style.height = this.rowHeight * (this.data ? this.data.length : 0)
      // } else {

      // }
      if (this.height) {
        style.height = Number(this.height) - this.headerRowHeight - (this.isShowSumary ? this.totalRowHeight : 0)
      }
      if (this.isHScroll) {
        style.height -= this.scrollbarWidth
      }
      style.height += 'px'
      style.width = this.fixedRightColWidth + 'px'
      return style;
    },
    bodyStyles () {
      let style = {}
      if (this.height) {
        style.height = Number(this.height) - this.headerRowHeight - (this.isShowSumary ? this.totalRowHeight : 0)
      }
      if (this.isHScroll) {
        style.width = this.columnsWidth + this.scrollbarWidth + 'px'
        style.height -= this.scrollbarWidth
      } else {
        style.width = '100%'
      }
      style.height += 'px'
      style.paddingLeft = this.fixedLeftColWidth + 'px'
      if (this.hasFixedRight) {
        style.paddingRight = this.fixedRightColWidth - this.scrollbarWidth + 'px'
      } else {
        style.paddingRight = this.fixedRightColWidth + 'px'
      }
      return style;
    },
    isHScroll () {
      return (this.columnsWidth > this.tableWidth) && this.tableWidth > 0
    },
    fixedLeftCol () {
      return this.columns.filter(v => v.fixed === 'left')
    },
    fixedLeftColWidth () {
      return this.fixedLeftCol.map(cell => cell.width).reduce((a, b) => a + b, 0);
    },
    fixedRightCol () {
      return this.columns.filter(v => v.fixed === 'right')
    },
    fixedRightColWidth () {
      return this.fixedRightCol.map(cell => cell.width).reduce((a, b) => a + b, 0);
    },
    centerCol () {
      return this.columns.filter(v => !v.fixed && v.type != 'expand')
    },
    expandCol () {
      const expand = this.columns.find(v => v.type === 'expand')
      return expand ? expand : {}
    }
  },
  mounted () {
    if (this.width) {
      this.tableWidth = this.width - 2
    } else {
      this.$nextTick(() => {
        this.tableWidth = this.$el.offsetWidth - 2
      })
    }
    on(window, 'resize', this.HandleResize)
    this.$emit('resize-table-height')
  },
  beforeDestroy () {
    off(window, 'resize', this.HandleResize)
  },
  methods: {
    HandleResize () {
      this.tableWidth = this.$el.offsetWidth - 2
      this.$emit('resize-table-height')
    },
    HandleColumnsChange (columns) {
      this.columnsWidth = columns.map(cell => Number(cell.width)).reduce((a, b) => a + b, 0)
      columns.forEach(v => {
        if (v.bizType && ['price', 'amt', 'qty', 'rate'].includes(v.bizType)) v.align = 'right'
      })
    },
    // public API so i Expose in km-grid
    GetSelectRows () {
      return this.itemVms[0].GetSelectRows()
    },
    // public API so i Expose in km-grid
    ClearSelectRows () {
      this.data.forEach(row => {
        this.$set(row, '_checked', false)
      })
    },
    // public API so i Expose in km-grid
    GetCurrentRow () {
      return this.data.find(row => row._clicked)
    },
  },
  watch: {
    columns: {
      handler: 'HandleColumnsChange',
      deep: true,
      immediate: true
    },
    data (val) {
      if (!val || !Array.isArray(val)) {
        this.data = []
      }
    }
  }
}
</script>