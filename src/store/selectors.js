import { createSelector } from 'reselect'
import { get, groupBy, reject, maxBy, minBy } from 'lodash';
import moment from 'moment'
import { ethers } from 'ethers';

const GREEN = '#25CE8F'
const RED = '#F45353'


const tokens = state => get(state, 'tokens.contracts')

const allOrders = state => get(state, 'exchange.allOrders.data', [])
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
const filledOrders = state => get(state, 'exchange.filledOrders.data', [])

const openOrders = state => {
  const all = allOrders(state)
  const filled = filledOrders(state)
  const cancelled = cancelledOrders(state)

  const openOrders = reject(all, (order) => {
    const orderFilled = filled.some((o) => o.id.toString() === order.id.toString())
    const orderCancelled = cancelled.some((o) => o.id.toString() === order.id.toString())
    return(orderFilled || orderCancelled)
  })

  return openOrders

}

const decorateOrder = (order, tokens) => {
  let token0Amount, token1Amount

  // Note: DApp should be considered token0, mETH is considered token1
  // Example: Giving mETH in exchange for DApp
  if (order.tokenGive === tokens[1].address) {
    token0Amount = order.amountGive // The amount of DApp we are giving
    token1Amount = order.amountGet // The amount of mETH we want...
  } else {
    token0Amount = order.amountGet // The amount of DApp we want
    token1Amount = order.amountGive // The amount of mETH we are giving...
  }

  // Calculate token price to 5 decimal places
  const precision = 100000
  let tokenPrice = (token1Amount / token0Amount)
  tokenPrice = Math.round(tokenPrice * precision) / precision

  return ({
    ...order,
    token1Amount: ethers.utils.formatUnits(token1Amount, "ether"),
    token0Amount: ethers.utils.formatUnits(token0Amount, "ether"),
    tokenPrice,
    formattedTimestamp: moment.unix(order.timestamp).format('h:mm:ssa d MMM D')
  })
}

// ------------------------------------------------------------------------------
// ALL FILLED ORDERS

export const filledOrdersSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    // Filter orders by selected tokens
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

    // Part 1: Sort ordering by date ascending
    // Part 2: Apply red/green order colors - meaning 'decorate' orders
    // Part 3: Sort orders by time descending

    // Part 1 - Ascending timestamp for price comparison
    orders = orders.sort((a, b) => a.timestamp - b.timestamp)

    // Part 2 - Decorate the orders
    orders = decorateFilledOrders(orders, tokens)

    // Part 3 - Descending timestamp for price comparison
    orders = orders.sort((a, b) => b.timestamp - a.timestamp)

    return orders  

  }
)

const decorateFilledOrders = (orders, tokens) => {
  // Track previous order to compare history
  let previousOrder = orders[0]


  return(

    orders.map((order) => {
      // Part 2 - Decorate each of the orders
      order = decorateOrder(order, tokens)
      order = decorateFilledOrder(order, previousOrder)
      previousOrder = order // Update previous order once it has been decorated
      return order
    })
  )
}

  // Singular for each individual order
const decorateFilledOrder = (order, previousOrder) => {
  return({
    ...order,
    tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
  })
}



const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {

    // Show green price if only one order exists
    if (previousOrder.id === orderId) {
      return GREEN
    }

    // Show green price if order price is MORE than previous order
    // Show red price if order price is LESS than previous order
  
    if (previousOrder.tokenPrice <+ tokenPrice) {
      return GREEN // Increase
    } else {
      return RED   // Decrease
    }

  }

// ------------------------------------------------------------------------------
// ORDER BOOK

export const orderBookSelector = createSelector(
  openOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    // Filter orders by selected tokens
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

    // Decorate orders
    orders = decorateOrderBookOrders(orders, tokens)

    // Group orders by "orderType"
    orders = groupBy(orders, 'orderType')

    // Fetch buy orders
    const buyOrders = get(orders, 'buy', [])

    // Sort buy orders by token price
     orders = {
        ...orders,
        buyOrders: buyOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
      }

    // Fetch sell orders
    const sellOrders = get(orders, 'sell', [])

    // Sort sell orders by token price
    orders = {
      ...orders,
      sellOrders: sellOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
    }

    return orders
  }
)

const decorateOrderBookOrders = (orders, tokens) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order, tokens)
      order = decorateOrderBookOrder(order, tokens)
      return(order)
    })
  )
}

const decorateOrderBookOrder = (order, tokens) => {
  const orderType = order.tokenGive === tokens[1].address ? 'buy' : 'sell'

  return({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderFillAction: (orderType === 'buy' ? 'sell' : 'buy')
  })
}


// ----------------------------------------------
// Price CHARYART

export const priceChartSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) { return }

    // Filter orders by selected tokens
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

    // Sort orders by date ascending to compare history
    orders = orders.sort((a, b) => a.timestamp - b.timestamp)

    // Decorate orders - add display attributes
    orders = orders.map((o) => decorateOrder(o, tokens))

    // Get last 2 orders for final price & price change
    let secondLastOrder, lastOrder
    [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)

    // Get last order price
    const lastPrice = get(lastOrder, 'tokenPrice', 0)

    // Get 2nd to last order
    const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)

     return ({ 
      lastPrice,
      lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
      series: [{
        data: buildGraphData(orders)
        
      }] 
    })

  }
)

const buildGraphData = (orders) => {

  // Group the orders by hour for the graph
  orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('hour').format())

  // Get each hour where data exists
  const hours = Object.keys(orders)

  // Build the graph series
  const graphData = hours.map((hour) => {
    
    // Fetch all orders from current hour
    const group = orders[hour]

    // Calculate price values: open, high, low, close
    const open = group[0]                      // 1st Order
    const high = maxBy(group, 'tokenPrice')    // High price
    const low = minBy(group, 'tokenPrice')     // Low price
    const close = group[group.length - 1]      // Final order

      return({
        x: new Date(hour),
        y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
      })
    })

  return graphData

}