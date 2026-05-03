import request from '@/utils/request'

export function getPriceAlerts (params = {}) {
  return request({
    url: '/api/price-alerts/alerts',
    method: 'get',
    params
  })
}

export function getPriceAlertById (id) {
  return request({
    url: `/api/price-alerts/alerts/${id}`,
    method: 'get'
  })
}

export function createPriceAlert (data) {
  return request({
    url: '/api/price-alerts/alerts',
    method: 'post',
    data
  })
}

export function updatePriceAlert (id, data) {
  return request({
    url: `/api/price-alerts/alerts/${id}`,
    method: 'put',
    data
  })
}

export function deletePriceAlert (id) {
  return request({
    url: `/api/price-alerts/alerts/${id}`,
    method: 'delete'
  })
}

export function togglePriceAlert (id, isActive) {
  return request({
    url: `/api/price-alerts/alerts/${id}`,
    method: 'put',
    data: { is_active: isActive ? 1 : 0 }
  })
}

export function checkPriceAlerts () {
  return request({
    url: '/api/price-alerts/alerts/check',
    method: 'post'
  })
}
