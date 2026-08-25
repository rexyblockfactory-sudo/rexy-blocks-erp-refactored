export interface FinancialSummary {
  totalRevenue: number;
  totalPaid: number;
  totalReceivable: number;
  totalCogs: number;
  totalGrossProfit: number;
  totalExpenses: number;
  knownNetProfit: number;

  totalFinishedGoods: number;
  costedFinishedGoods: number;
  finishedGoodsValue: number;

  salesWithKnownCost: number;
  salesWithUnknownCost: number;
}