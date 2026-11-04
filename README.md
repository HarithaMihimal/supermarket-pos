<img width="6519" height="11387" alt="diagram" src="https://github.com/user-attachments/assets/016be608-3b90-4d3b-8c78-b1ce1e888742" />

## Supplier and purchasing management

Managers and administrators can use the **Purchasing** workspace to:

- maintain supplier records;
- create purchase orders with product quantities and unit costs;
- receive goods fully or partially against an order;
- update branch inventory and receipt movements transactionally; and
- track purchase order totals and apply the latest received cost to products.

The backend exposes these authenticated endpoints under `/api/purchases`. Migration `014_supplier_purchases.sql` creates the supplier, purchase order, and goods receipt tables.
