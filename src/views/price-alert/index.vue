<template>
  <div class="price-alert-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <h2>
        <a-icon type="bell" />
        价格预警
      </h2>
      <a-button type="primary" @click="showAddModal" :loading="loadingCreate">
        <a-icon type="plus" />
        添加预警
      </a-button>
    </div>

    <!-- 预警列表 -->
    <a-spin :spinning="loadingList">
      <div v-if="alerts.length === 0" class="empty-state">
        <a-empty description="暂无价格预警">
          <a-button type="primary" @click="showAddModal">
            <a-icon type="plus" />
            添加第一个预警
          </a-button>
        </a-empty>
      </div>

      <div v-else class="alerts-grid">
        <div v-for="alert in alerts" :key="alert.id" class="alert-card">
          <div class="alert-header">
            <div class="alert-symbol">
              <a-tag :color="getMarketColor(alert.market)" size="small">
                {{ alert.market }}
              </a-tag>
              <span class="symbol-name">{{ alert.symbol }}</span>
            </div>
            <div class="alert-actions">
              <a-switch
                :checked="alert.is_active === 1"
                @change="toggleAlert(alert)"
                size="small"
              />
              <a-tooltip title="编辑">
                <a-button
                  type="link"
                  size="small"
                  @click="editAlert(alert)"
                >
                  <a-icon type="edit" />
                </a-button>
              </a-tooltip>
              <a-popconfirm
                title="确定要删除这个预警吗？"
                @confirm="deleteAlert(alert.id)"
              >
                <a-button type="link" size="small" class="delete-btn">
                  <a-icon type="delete" />
                </a-button>
              </a-popconfirm>
            </div>
          </div>

          <div class="alert-body">
            <div class="alert-condition">
              <span class="label">目标价格</span>
              <span class="value">
                <a-icon
                  :type="alert.direction === 'above' ? 'rise' : 'fall'"
                  :style="{ color: alert.direction === 'above' ? '#52c41a' : '#f5222d' }"
                />
                {{ formatNumber(alert.target_price) }}
              </span>
            </div>

            <div class="alert-status">
              <span class="status-badge" :class="getAlertStatusClass(alert)">
                {{ getAlertStatusText(alert) }}
              </span>
            </div>

            <div v-if="alert.notes" class="alert-notes">
              <span class="label">备注</span>
              <span class="value">{{ alert.notes }}</span>
            </div>
          </div>

          <div class="alert-footer">
            <span class="created-time">
              创建于 {{ formatTime(alert.created_at) }}
            </span>
            <span v-if="alert.triggered_at" class="triggered-time">
              触发于 {{ formatTime(alert.triggered_at) }}
            </span>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- 添加/编辑预警弹窗 -->
    <a-modal
      :title="editingAlert ? '编辑预警' : '添加预警'"
      :visible="visibleModal"
      @ok="handleSaveAlert"
      @cancel="closeModal"
      :confirm-loading="loadingSave"
      width="500px"
    >
      <a-form :form="alertForm" layout="vertical">
        <!-- 市场选择 -->
        <a-form-item label="市场类型">
          <a-select
            v-decorator="[
              'market',
              { rules: [{ required: true, message: '请选择市场类型' }], initialValue: 'Crypto' }
            ]"
            placeholder="选择市场类型"
            @change="handleMarketChange"
          >
            <a-select-option v-for="mt in marketTypes" :key="mt.value" :value="mt.value">
              {{ mt.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 币对搜索 -->
        <a-form-item label="币对/标的">
          <a-select
            v-decorator="[
              'symbol',
              { rules: [{ required: true, message: '请选择或输入币对' }] }
            ]"
            show-search
            placeholder="搜索或输入币对"
            :filter-option="false"
            :not-found-content="symbolSearchKeyword ? '输入作为自定义币对' : '无结果'"
            @search="handleSymbolSearch"
            @change="handleSymbolSelect"
          >
            <a-select-option
              v-for="item in symbolSearchResults"
              :key="item.symbol"
              :value="item.symbol"
            >
              <div class="symbol-option">
                <strong>{{ item.symbol }}</strong>
                <span v-if="item.name" class="symbol-name">{{ item.name }}</span>
              </div>
            </a-select-option>
            <a-select-option
              v-if="symbolSearchKeyword && !symbolSearchResults.find(r => r.symbol === symbolSearchKeyword)"
              :key="'custom-' + symbolSearchKeyword"
              :value="symbolSearchKeyword"
            >
              <div class="symbol-option manual-input">
                <a-icon type="edit" style="margin-right: 6px; color: #1890ff" />
                使用 <strong style="color: #1890ff">{{ symbolSearchKeyword }}</strong>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 触发方向 -->
        <a-form-item label="触发方向">
          <a-select
            v-decorator="[
              'direction',
              { rules: [{ required: true, message: '请选择触发方向' }], initialValue: 'above' }
            ]"
            placeholder="选择触发方向"
          >
            <a-select-option value="above">
              <a-icon type="rise" style="color: #52c41a; margin-right: 6px" />
              价格高于目标
            </a-select-option>
            <a-select-option value="below">
              <a-icon type="fall" style="color: #f5222d; margin-right: 6px" />
              价格低于目标
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 目标价格 -->
        <a-form-item label="目标价格">
          <a-input-number
            v-decorator="[
              'target_price',
              { rules: [{ required: true, message: '请输入目标价格' }] }
            ]"
            :min="0"
            :step="0.01"
            :precision="8"
            style="width: 100%"
            placeholder="输入目标价格"
          />
        </a-form-item>

        <!-- 备注 -->
        <a-form-item label="备注">
          <a-textarea
            v-decorator="['notes']"
            placeholder="添加备注（可选）"
            :rows="2"
            maxlength="200"
            :show-count="true"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  getPriceAlerts,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
  togglePriceAlert
} from '@/api/price-alert'
import { getMarketTypes, searchSymbols } from '@/api/market'

export default {
  name: 'PriceAlert',
  data () {
    return {
      alerts: [],
      loadingList: false,
      loadingCreate: false,
      loadingSave: false,
      visibleModal: false,
      editingAlert: null,
      alertForm: this.$form.createForm(this),
      marketTypes: [
        { value: 'Crypto', label: '加密货币' },
        { value: 'USStock', label: '美股' },
        { value: 'Forex', label: '外汇' },
        { value: 'Futures', label: '期货' }
      ],
      symbolSearchKeyword: '',
      symbolSearchResults: []
    }
  },
  computed: {
    ...mapState({
      isDarkTheme: state => state.app.isDarkTheme
    })
  },
  mounted () {
    this.loadAlerts()
    this.loadMarketTypes()
  },
  methods: {
    async loadAlerts () {
      this.loadingList = true
      try {
        const res = await getPriceAlerts({ active_only: false })
        if (res.code === 1) {
          this.alerts = res.data || []
        }
      } catch (error) {
        this.$message.error('加载预警列表失败')
        console.error(error)
      } finally {
        this.loadingList = false
      }
    },

    async loadMarketTypes () {
      try {
        const res = await getMarketTypes()
        if (res.code === 1 && res.data) {
          this.marketTypes = res.data.map(item => ({
            value: item.value,
            label: this.$t(item.i18nKey) || item.value
          }))
        }
      } catch (error) {
        console.error('加载市场类型失败', error)
      }
    },

    async handleSymbolSearch (keyword) {
      this.symbolSearchKeyword = keyword
      if (!keyword) {
        this.symbolSearchResults = []
        return
      }
      try {
        const formData = this.alertForm.getFieldsValue()
        const market = (formData.market && formData.market.value) || formData.market || 'Crypto'
        const res = await searchSymbols({ market, keyword, limit: 10 })
        if (res.code === 1) {
          this.symbolSearchResults = res.data || []
        }
      } catch (error) {
        console.error('搜索失败', error)
        this.symbolSearchResults = []
      }
    },

    handleSymbolSelect (value) {
      this.alertForm.setFieldsValue({ symbol: value })
    },

    handleMarketChange (value) {
      this.alertForm.setFieldsValue({ symbol: undefined })
      this.symbolSearchKeyword = ''
      this.symbolSearchResults = []
    },

    showAddModal () {
      this.editingAlert = null
      this.visibleModal = true
      this.$nextTick(() => {
        this.alertForm.resetFields()
      })
    },

    editAlert (alert) {
      this.editingAlert = alert
      this.visibleModal = true
      this.$nextTick(() => {
        this.alertForm.setFieldsValue({
          market: alert.market,
          symbol: alert.symbol,
          target_price: alert.target_price,
          direction: alert.direction,
          notes: alert.notes
        })
      })
    },

    closeModal () {
      this.visibleModal = false
      this.editingAlert = null
      this.symbolSearchKeyword = ''
      this.symbolSearchResults = []
    },

    async handleSaveAlert () {
      try {
        const values = await this.alertForm.validateFields()
        this.loadingSave = true

        if (this.editingAlert) {
          const res = await updatePriceAlert(this.editingAlert.id, values)
          if (res.code === 1) {
            this.$message.success('更新成功')
            this.closeModal()
            await this.loadAlerts()
          }
        } else {
          const res = await createPriceAlert(values)
          if (res.code === 1) {
            this.$message.success('创建成功')
            this.closeModal()
            await this.loadAlerts()
          }
        }
      } catch (error) {
        console.error('保存失败', error)
      } finally {
        this.loadingSave = false
      }
    },

    async toggleAlert (alert) {
      try {
        const newActive = alert.is_active !== 1
        await togglePriceAlert(alert.id, newActive)
        alert.is_active = newActive ? 1 : 0
        if (newActive) {
          alert.is_triggered = 0
        }
        this.$message.success(newActive ? '预警已启用' : '预警已禁用')
      } catch (error) {
        this.$message.error('操作失败')
        console.error(error)
      }
    },

    async deleteAlert (id) {
      try {
        const res = await deletePriceAlert(id)
        if (res.code === 1) {
          this.$message.success('删除成功')
          await this.loadAlerts()
        }
      } catch (error) {
        this.$message.error('删除失败')
        console.error(error)
      }
    },

    getMarketColor (market) {
      const colorMap = {
        'Crypto': 'blue',
        'USStock': 'green',
        'Forex': 'purple',
        'Futures': 'orange'
      }
      return colorMap[market] || 'default'
    },

    getAlertStatusClass (alert) {
      if (alert.is_active !== 1) return 'status-disabled'
      if (alert.is_triggered === 1) return 'status-triggered'
      return 'status-watching'
    },

    getAlertStatusText (alert) {
      if (alert.is_active !== 1) return '已禁用'
      if (alert.is_triggered === 1) return '已触发'
      return '监控中'
    },

    formatNumber (num) {
      if (num === null || num === undefined) return '-'
      if (typeof num !== 'number') {
        num = parseFloat(num)
      }
      if (isNaN(num)) return '-'
      return num.toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 0 })
    },

    formatTime (timeStr) {
      if (!timeStr) return '-'
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style lang="less" scoped>
.price-alert-container {
  padding: 24px;
  min-height: 100vh;
  background: #f0f2f5;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: #000000d9;

      .anticon {
        margin-right: 8px;
        color: #1890ff;
      }
    }
  }

  .empty-state {
    padding: 80px 0;
  }

  .alerts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 16px;
  }

  .alert-card {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .alert-symbol {
        display: flex;
        align-items: center;
        gap: 8px;

        .symbol-name {
          font-weight: 500;
          font-size: 16px;
          color: #000000d9;
        }
      }

      .alert-actions {
        display: flex;
        align-items: center;
        gap: 4px;

        .delete-btn {
          color: #f5222d;
        }
      }
    }

    .alert-body {
      .alert-condition {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #fafafa;
        border-radius: 4px;
        margin-bottom: 12px;

        .label {
          font-size: 14px;
          color: #00000073;
        }

        .value {
          font-size: 18px;
          font-weight: 500;
          color: #000000d9;
        }
      }

      .alert-status {
        text-align: right;
        margin-bottom: 12px;

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;

          &.status-disabled {
            background: #f5f5f5;
            color: #00000040;
          }

          &.status-watching {
            background: #e6f7ff;
            color: #1890ff;
          }

          &.status-triggered {
            background: #f6ffed;
            color: #52c41a;
          }
        }
      }

      .alert-notes {
        display: flex;
        gap: 8px;
        padding: 8px 0;
        border-top: 1px solid #f0f0f0;

        .label {
          font-size: 13px;
          color: #00000073;
          flex-shrink: 0;
        }

        .value {
          font-size: 13px;
          color: #000000d9;
        }
      }
    }

    .alert-footer {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #00000040;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;

      .triggered-time {
        color: #52c41a;
      }
    }
  }
}

:deep(.symbol-option) {
  display: flex;
  align-items: center;
  gap: 8px;

  .symbol-name {
    color: #00000073;
    font-size: 12px;
  }
}
</style>
