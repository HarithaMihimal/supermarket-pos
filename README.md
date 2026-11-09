<img width="6519" height="11387" alt="diagram" src="https://github.com/user-attachments/assets/016be608-3b90-4d3b-8c78-b1ce1e888742" />

## Supplier and purchasing management

Managers and administrators can use the **Configuration** portal (the gear button) to:

- add and review supplier records.

Those suppliers immediately appear in the **Purchasing** workspace, where managers and administrators can:

- create purchase orders with product quantities and unit costs;
- receive goods fully or partially against an order;
- update branch inventory and receipt movements transactionally; and
- track purchase order totals and apply the latest received cost to products.

The backend exposes these authenticated endpoints under `/api/purchases`. Migration `014_supplier_purchases.sql` creates the supplier, purchase order, and goods receipt tables.

## Multiple branches

Branch inventory, sales, reports, purchases, and shop settings are scoped to the signed-in user's branch. Administrators can create branches and assign manager or cashier accounts from **Branches & users**. Managers and administrators can transfer available stock from their branch to another branch; both inventory balances and the paired stock movements are updated transactionally. Transfer history is visible to both the sending and receiving branches.

Migration `015_multi_branch.sql` backfills branch inventory for existing catalog items and creates the stock transfer tables.
