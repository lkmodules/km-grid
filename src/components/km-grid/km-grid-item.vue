<template>
  <div :class="gridCls" :style="{right:fixed==='right'?$parent.scrollbarWidth+'px':''}">
    <div :class="cls+'-header-scroll'" ref="header" :style="headerScrollStyles">
      <div :class="cls+'-header'" :style="headerStyles">
        <div :class="[cls+'-tr',!$parent.hasFixedRight&&!$parent.isVScroll?cls+'-tr-br':'']">
          <div
            :class="[cls+'-th',$parent.border?cls+'-border':'']"
            :style="{width:col.width+'px',height:$parent.headerRowHeight-1+'px',lineHeight:$parent.headerRowHeight-1+'px',textAlign:col.align}"
            v-for="(col, colIndex) in columns"
            :key="colIndex"
            @mousemove="HandlerMousemove($event, col, colIndex)"
            @mousedown="HandlerMousedown($event, col, colIndex)"
            @mouseleave="HandlerMouseleave"
          >
            <template v-if="col.type==='selection'">
              <Checkbox
                :indeterminate="indeterminate"
                :disabled="selectAllDisabled"
                :value="isSelectAll"
                @on-change="toggleSelectAll"
              ></Checkbox>
            </template>
            <template v-else>
              <span
                @click.stop="HandleHeaderTdClick(col)"
                :style="{cursor:col.sortable?'pointer':'',userSelect: 'none'}"
              >{{col.title}}</span>
              <span :class="cls + '-sort'" v-if="col.sortable">
                <i
                  @click="HandleHeaderTdClick(col, 'asc')"
                  class="ivu-icon km km-up"
                  :class="col._sortType==='asc'?cls+'-sort-active':''"
                ></i>
                <i
                  @click="HandleHeaderTdClick(col, 'desc')"
                  class="ivu-icon km km-down"
                  :class="col._sortType==='desc'?cls+'-sort-active':''"
                ></i>
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div
      :class="fixed?cls+'-noscroll':cls+'-body-scroll'"
      :style="scrollStyles"
      @scroll="HandleBodyScroll"
      ref="body"
    >
      <div
        v-if="(!$parent.data||!$parent.data.length)&&!fixed"
        :style="bodyStyles"
        :class="cls+'-null'"
      ></div>
      <div v-else :class="cls+'-body'" :style="bodyStyles">
        <div :class="cls+'-tr-wrap'" @mouseleave.stop="HandleMouseLeave">
          <template v-for="(row, rowIndex) in $parent.data">
            <div :key="rowIndex" :class="[cls+'-tr',row._clicked||hoverIndex===rowIndex?cls+'-tr-active':'',!$parent.hasFixedRight?cls+'-tr-br':'']"
              @mouseenter.stop="HandleMouseEnter(row, rowIndex)"
              @click="HandTrClick(row, rowIndex)"
              @dblclick.stop="HandleTrDbClick($event, row, rowIndex)"
            >
              <div
                :class="[cls+'-td',$parent.border?cls+'-border':'']"
                v-for="(col, colIndex) in columns"
                :style="{width:col.width+'px',height:$parent.rowHeight-1+'px',lineHeight:$parent.rowHeight-1+'px',textAlign:col.align}"
                :key="colIndex"
              >
                <template
                  v-if="col.type==='index'"
                >{{($parent.current-1)*$parent.pageSize+rowIndex+1}}</template>
                <template v-else-if="col.type==='selection'">
                  <Checkbox
                    :value="row._checked"
                    :disabled="row._disabled"
                    @on-change="toggleSelect(arguments, row)"
                  ></Checkbox>
                </template>
                <template v-else-if="col.type==='handle'">
                  <Button
                    v-for="(item, itemIndex) in col.handle"
                    :key="itemIndex"
                    v-show="handleIconShow(item, row)"
                    type="text"
                    :icon="HandleIcon(item)"
                    :class="cls+'-cell-operate'"
                    :title="item.title"
                    @click.native.stop="HandleIconClick(item, row)"
                  ></Button>
                </template>
                <template v-else-if="col.render">
                  <td-render :row="row" :column="col" :index="rowIndex" :render="col.render"></td-render>
                </template>
                <template v-else>
                  <Badge v-if="col.enumType" :status="col.enumType[row[col.key]]"></Badge>
                  <span
                    :class="col.click?cls+'-link-td':''"
                    @click="HandleLinkClick($event, row, col)"
                  >{{GetTdData(row, col)}}</span>
                </template>
              </div>
            </div>
            <div :key="rowIndex" v-if="!fixed&&expandColumn.render" :class="cls+'-tr-expand'">
              <div style="width:100%" v-if="row._clicked">
                <td-render :row="row" :render="expandColumn.render"></td-render>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div
      :class="cls+'-total-scroll'"
      ref="total"
      :style="totalScrollStyles"
      v-if="$parent.isShowSumary"
    >
      <div :class="cls+'-total'" :style="headerStyles">
        <div :class="[cls+'-tr',!$parent.hasFixedRight?cls+'-tr-br':'']">
          <div
            :class="[cls+'-th',$parent.border?cls+'-border':'']"
            :style="{width:col.width+'px',height:$parent.totalRowHeight-1+'px',lineHeight:$parent.totalRowHeight-1+'px',textAlign:col.align}"
            v-for="(col, colIndex) in columns"
            :key="colIndex"
          >{{GetTotalData(col)}}</div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
const cls = 'km-grid'

import Emitter from '../../utils/emitter'
import TdRender from './render'
import { on, off } from '../../utils/dom'
import { formatDate } from "../../utils/dataFormat"
import { deepCopy, typeOf } from '../../utils/assist'

export default {
  name: 'KmGridItem',
  mixins: [Emitter],
  components: { TdRender },
  data () {
    return {
      cls,
      currentSortField: '',
      hoverIndex: -1
    }
  },
  props: {
    columns: {
      type: Array,
      default: () => {
        return []
      }
    },
    expandColumn: Object,
    headerStyles: Object,
    bodyStyles: Object,
    fixed: {
      type: String,
      default: ''
    }
  },
  computed: {
    scrollStyles () {
      let style = {}
      if (!this.fixed && !this.$parent.isVScroll) {
        style.width = `calc(100% - ${this.$parent.scrollbarWidth}px)`
      } else {
        style.width = '100%'
      }
      return style
    },
    headerScrollStyles () {
      let style = {}
      if (!this.fixed && !this.$parent.isVScroll) {
        style.width = `calc(100% - ${this.$parent.scrollbarWidth}px)`
      } else {
        if (!this.fixed && this.$parent.isHScroll) {
          style.width = `calc(100% - ${this.$parent.scrollbarWidth}px)`
        } else {
          style.width = '100%'
        }
      }
      return style
    },
    totalScrollStyles () {
      let style = {}
      if (!this.fixed && !this.$parent.isVScroll) {
        style.width = `calc(100% - ${this.$parent.scrollbarWidth}px)`
      } else {
        if (!this.fixed && this.$parent.isHScroll) {
          style.width = `calc(100% - ${this.$parent.scrollbarWidth}px)`
        } else {
          style.width = '100%'
        }
      }
      return style
    },
    gridCls () {
      if (!this.fixed) {
        return 'km-grid-center'
      } else if (this.fixed === 'left') {
        return 'km-grid-fixed-left'
      } else if (this.fixed === 'right') {
        return 'km-grid-fixed-right'
      }
      return ''
    },
    selectAllDisabled () {
      if (!this.$parent.data || !this.$parent.data.length) return false
      return this.$parent.data.every(v => v._disabled)
    },
    isSelectAll () {
      if (!this.$parent.data) return false
      const data = this.$parent.data.filter(v => !v._disabled)
      return !!data.length && data.every(v => v._checked)
    },
    indeterminate () {
      if (!this.$parent.data || !this.$parent.data.length) return false
      let result = this.$parent.data.some(v => v._checked)
      if (this.isSelectAll) result = false
      return result
    }
  },
  mounted () {
    this.dispatch("KmGrid", "on-km-grid-item-add", this);
  },
  methods: {
    HandlerMousemove (e, col) {
      if (col.type === 'selection') return
      if (!this.$parent.draggable) return
      let rect = e.target.getBoundingClientRect();
      if (rect.width > 10 && rect.right - e.pageX < 8) {
        this.$refs.header.style.cursor = 'col-resize'
      } else {
        this.$refs.header.style.cursor = ''
      }
    },
    HandlerMouseleave () {
      this.$refs.header.style.cursor = ''
      document.onselectstart = () => { return true }
      document.ondragstart = () => { return true }
    },
    HandlerMousedown (e, col) {
      if (col.type === 'selection') return
      if (!this.$parent.draggable) return
      document.onselectstart = () => { return false }
      document.ondragstart = () => { return false }
      const handleMouseMove = event => {
        this.$parent.isDragging = true
        let diff = event.pageX - this.$parent.$el.getBoundingClientRect().left
        this.$parent.dragLineLeft = diff
        this.$refs.header.style.cursor = 'col-resize'
      };
      const handleMouseUp = event => {
        let diff = event.pageX - e.pageX
        this.$parent.dragLineLeft = diff
        col.width = col.width + diff
        this.$parent.isDragging = false
        off(document, 'mousemove', handleMouseMove)
        off(document, 'mouseup', handleMouseUp)
      };
      on(document, 'mousemove', handleMouseMove)
      on(document, 'mouseup', handleMouseUp)
    },
    GetTdData (row, col) {
      if (col.enumData) {
        let desc = (col.desc && row[col.desc(row)]) ? '(' + row[col.desc(row)] + ')' : ''
        return col.desc ? col.enumData[row[col.key]] + desc : col.enumData[row[col.key]]
      } else if (col.valueKey) {
        return row[col.key] ? `[${row[col.key]}]${row[col.valueKey]}` : ''
      } else if (['date', 'datetime', 'time'].includes(col.type)) {
        const dateEnum = { date: 'yyyy-MM-dd', datetime: 'yyyy-MM-dd HH:mm:ss', time: 'HH:mm:ss' }
        if (!row[col.key]) {
          return ''
        } else {
          return formatDate(row[col.key], col.format || dateEnum[col.type])
        }
      } else if (col.bizType && ['price', 'amt', 'qty', 'rate'].includes(col.bizType)) {
        const formatEnum = { price: 4, amt: 2, qty: 3, rate: 4 }
        if (typeOf(row[col.key]) === 'null') {
          return '-'
        } else {
          return parseFloat(row[col.key]).toFixed(col.format || formatEnum[col.bizType])
        }
      }
      return row[col.key]
    },
    GetTotalData (col) {
      if (!col.total) {
        return ''
      } else if (col.totalValue) {
        return col.totalValue
      } else if (col.bizType && ['price', 'qty', 'amt'].includes(col.bizType)) {
        const formatEnum = { price: 4, qty: 3, amt: 4 }
        return this.$parent.data.map(row => Number(row[col.key])).reduce((a, b) => a + b, 0).toFixed(col.format || formatEnum[col.bizType])
      }
      return ''
    },
    HandleLinkClick (event, row, col) {
      if (col.click) {
        event.preventDefault()
        col.click(col.key, row)
      }
    },
    toggleSelectAll () {
      let flag = !this.isSelectAll
      this.$parent.data.forEach(row => {
        if (row._disabled) return
        this.$set(row, '_checked', flag)
      })
      let changeRows = deepCopy(this.$parent.data)
      this.$emit('on-selection-change', this.GetSelectRows(), flag, changeRows)
    },
    // to do event.preventDefault() how to ?
    // #20190901 fxied this bug in checkbox and switch
    toggleSelect (arg, row) {
      this.$set(row, '_checked', arg[0])
      let changeRows = []
      changeRows.push(row)
      this.$emit('on-selection-change', this.GetSelectRows(), arg[0], changeRows)
    },
    GetSelectRows () {
      return this.$parent.data.filter(row => row._checked)
    },
    HandleHeaderTdClick (col, sortType = '') {
      if (!col.sortable) return
      if (this.currentSortField != col.key) {
        this.columns.map(v => v._sortType = '')
      }
      this.currentSortField = col.key
      if (!sortType) {
        sortType = 'asc'
        if (!col._sortType) {
          sortType = 'asc'
        } else if (col._sortType === 'asc') {
          sortType = 'desc'
        } else if (col._sortType === 'desc') {
          sortType = 'asc'
        }
      }
      this.$set(col, '_sortType', sortType)
      this.$emit('on-sort-change', { column: col, key: col.key, order: sortType })
    },
    // Serious Consumption Performance
    HandleMouseEnter (row, rowIndex) {
      this.$parent.itemVms.map(v => v.hoverIndex = rowIndex)
    },
    // Serious Consumption Performance Deal with it in other ways
    HandleMouseLeave () {
      this.$parent.itemVms.map(v => v.hoverIndex = -1)
    },
    HandTrClick (row, rowIndex) {
      if (this.timeOut) window.clearTimeout(this.timeOut)
      if (this.$parent.clickAsync) {
        this.timeOut = window.setTimeout(() => {
          this.$emit('on-row-click', row, rowIndex)
          if (this.$parent.data.find(v => v._clicked)) {
            this.$parent.data.find(v => v._clicked)._clicked = false
          }
          this.$set(row, '_clicked', true)
        }, 200)
      } else {
        this.$emit('on-row-click', row, rowIndex)
        if (this.$parent.data.find(v => v._clicked)) {
          this.$parent.data.find(v => v._clicked)._clicked = false
        }
        this.$set(row, '_clicked', true)
      }
    },
    // to do preventDefault click event
    // #20190910 fixed this bug
    HandleTrDbClick (event, row, rowIndex) {
      if (this.timeOut) window.clearTimeout(this.timeOut)
      this.$emit('on-row-dblclick', row, rowIndex)
    },
    HandleBodyScroll (event) {
      this.$refs.header.scrollLeft = event.target.scrollLeft
      if (this.$parent.itemVms && this.$parent.itemVms.length > 0) {
        this.$parent.itemVms.forEach(v => {
          let scrollDom = v.$el.querySelectorAll('.km-grid-noscroll')[0]
          if (scrollDom) {
            scrollDom.scrollTop = event.target.scrollTop
          }
        })
      }
    },
    handleIconShow (item, row) {
      switch (item.type) {
        case 'edit':
          return true
        case 'delete':
          return this.$parent.auth ? this.$parent.auth.DELETE : true
        default:
          return row['__' + item.type]
      }
    },
    HandleIcon (item) {
      switch (item.type) {
        case 'edit':
          return 'km-edit'
        case 'delete':
          return 'km-del'
        default:
          return item.icon;
      }
    },
    HandleIconClick (item, row) {
      switch (item.type) {
        case 'edit':
          this.$emit("on-edit-row", row);
          break;
        case 'delete':
          this.$emit('on-delete-row', row);
          break;
        default:
          return item.click(row);
      }
    },
  }
}
</script>