# km-grid

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
<p class="my-tit"><span>如何优雅设计一个组件</span></p>

*本组件已开源，已***npm publish***，可自行***npm install km-grid***。*
###效果展示

###设计原则
*注：虽然现在已经出现大量优秀的UI框架，如elementUI，iviewUI，单从业务、功能及性能仍不能满足项目所有需求，这时，就要考虑如何设计适合自己的组件。*
**组件设计**其实就是**模块**的设计。我把它分为4个部分：**UI设计**，**基本功能**，**业务拓展需求**，**性能**。以下我已我自己设计的高性能table为例，剖析我是如何优雅的设计一个组件。
>- **UI设计交互**就好比模块的***import***、***exports***，要保持统一的出口。即统一风格配色，统一交互。
- **基本功能**就好比模块的基本作用。必须保证基本功能的同时，兼容其他。
- **业务拓展**就好比模块间的集成，这就要求组件可依耐性低、可拔插集成、高聚低耦合。
- **性能**要考虑到大量数据或大量计算与***GUI***渲染线程互斥导致的性能问题。

###实现步骤
*注：一个组件的设计先从基本功能开始。*
####一、布局
先看table的基本功能包括：头部、序号列、多选列、左右固定列、总计行；
业务拓展功能：列搜索。
>考虑到左右固定列需要单独的头部、搜索行、内容、总计行。可将***km-grid***设计为**3**个单独的***table***，每个单独的***table***都是一个独立的***km-grid-item***。
```
<div :class="cls" :style="tableStyles">
  <km-grid-item v-if="fixedLeftCol&&fixedLeftCol.length" fixed="left" v-on="$listeners" :columns="fixedLeftCol" :header-styles="leftFixedHeaderStyles" :body-styles="leftFixedBodyStyles"></km-grid-item>
  <km-grid-item v-on="$listeners" :columns="centerCol" :expandColumn="expandCol" :header-styles="headerStyles" :body-styles="bodyStyles"></km-grid-item>
  <km-grid-item v-if="fixedRightCol&&fixedRightCol.length" fixed="right" v-on="$listeners" :columns="fixedRightCol" :header-styles="rightFixedHeaderStyles" :body-styles="rightFixedBodyStyles"></km-grid-item>
</div>
```
>这样，整个table的设计便会轻便且简洁。

单个table的设计又怎么办呢？
那我是如何在单个组件驱动其他组件的呢？
首先在km-grid-item mounted是，发送当前的VueComponent：
```
mounted () {
  this.dispatch("KmGrid", "on-km-grid-item-add", this);
}
```
在km-grid接收：
```
created () {
  this.$on('on-km-grid-item-add', item => {
    this.itemVms.push(item);
  })
}
```
接着在事件中触发同步驱动整个table：
```
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
}
```
####二、业务拓展需求
业务拓展需求有：根据行数据显示不同按钮，不同行为，数据格式化，行下拉动态渲染。
#####1、根据行数据显示不同按钮
把需求转化为数据操作就是先获取行数据，根据行数据展示不同的按钮，然后自定义行为在业务中编写：
先定义column及操作:
```
{
  title: '操作',
  type: 'handle',
  handle: [
    {
      type: 'edit'
    },
    {
      type: 'warehouse',
      icon: 'km-stock',
      click: row => {
        this.$refs.listpage.showList = false
        this.$refs.WarehouseInfo.loadEntity(row.id)
      }
    }
  ],
  width: 90,
  align: 'left',
  fixed: 'right'
}
```
根据行数据渲染：
```
showCustomOperate: {
  warehouse: row => {
    switch (row.type) {
      case '4':
        return true
      default:
        return false
    }
  }
}

RebuildTableDataByColOperate (columns, data) {
  data.forEach(v => {
    handles.forEach(handle => {
      v['__' + handle.type] =
        this.showCustomOperate[handle.type](v) || false
    })
  })
}

HandleIconClick (item, row) {
  return item.click(row);
}
```
>通过这种集成方式组件不必关心业务需求，自动化配置自定义按钮及操作行为，可拔插的集成，避免影响平台组件维护。

#####2、行下拉动态渲染
首先在columns里配置：
```
{
  type: 'expand',
  width: 50,
  render: (h, params) => {
    return h(inventoryControl, {
      props: {
        row: params.row
      }
    })
  }
}

components: {
  inventoryControl: () => import('@/view/main-components/inventoryControl.vue')
}
```
然后在km-grid-item的tr里面根据行数据动态render：
```
<div v-if="!fixed&&expandColumn.render" :class="cls+'-tr-expand'">
  <div style="width:100%" v-if="row._clicked">
    <td-render :row="row" :render="expandColumn.render"></td-render>
  </div>
</div>
```
>通过这种集成方式组件不必关心业务需求，返回行数据让业务自己交互，不会污染当前组件DOM及多余的代码逻辑。

#####3、数据格式化
数据格式化是一个老生常谈的问题，例如下面我们只用通过这个方法即可格式化系统数据：
```
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
}
```
这种默认配置是前端与后端约定好，前端在***columns***规定好，即可有序展开。

>总结一下就是，拓展需求就是要可尽量少的配置、自动化、可拔插、不污染组件、减少增加组件逻辑、无代码侵入的支持业务功能。

####三、性能
经测试，***km-grid***拥有高效的性能并兼容主流浏览器（**ie11**以上，包含**ie11**）。对比了同样的***iview-table***，***element-table***，在**500**条级数据时，***km-grid***表现更佳，大大超越***iview-table***。各位同学可直接在***npm install***。

###组件API设计
####一、prop
| 属性名| 属性类型| 描述|
|-----|-----|------|
| data | Array   | 元数据 |
| headerRowHeight| Number| 头部高度|
| rowHeight| Number| 行高度|
| totalRowHeight| Number| 总计高度|
| height| Number| 指定高度 |
| width| Number| 指定宽度 |
| border| Boolean| 显示分割线|
| pageSize| Number| 分页数据|
| current| Number| 分页数据|
| draggable| Boolean| 是否可拖拽列宽|
| clickAsync| Number| 点击事件是否异步加载|


####二、events
| 事件名| 描述|
|-----|------|
| on-selection-change| 全选，单选时触发|
| on-row-click| 点击|
| on-row-dblclick| 双击|
| on-sort-change| 排序|

####三、methods

| 方法名| 描述|
|-----|------|
| GetSelectRows| 获取勾选选行|
| ClearSelectRows| 清除沟选行|
| GetCurrentRow|获取选中行 |

***km-grid***在设计上精简，使用***v-on="$listeners"***向上抛出事件，所以写***km-grid-item***的***emit***事件不用重复的再往上面抛，而对于需要对外开放的***API***，***km-grid***则故意将需要开放的***API***写在***km-grid***里面。
```
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
}
```
###可编辑的双向绑定table
现在的前端越来越后后端化，从npm仓库到模块化，自动化，前端早已不是几年前的那个画页面前端。更多的考虑是模块化组件的同时，处理好组件与平台，平台与业务这三方面的“交互”。如果你能很好的理解VUE的VueComponent响应式，将在VUE的海洋如鱼得水，同时也对面向对象编程有自己独到的见解。
下一期我将展示如何将***km-grid***即成为高性能的可编辑双向绑定***table***，同时也将开源。
