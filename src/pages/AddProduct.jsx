import "./AddProduct.css";

function AddProduct({
  showAddForm,
  setShowAddForm,
  newProduct,
  setNewProduct,
  handleAddProduct,
  setError,
}) {
  if (!showAddForm) return null;

  const update = (patch) =>
    setNewProduct((prev) => ({ ...prev, ...patch }));

  const isFeatured = newProduct.priority === 1;

  const validate = () => {
    if (!newProduct.name?.trim()) return "Name is required";
    if (!newProduct.price || newProduct.price <= 0) return "Valid price required";

    if (
      newProduct.original_price &&
      newProduct.original_price < newProduct.price
    ) {
      return "MRP must be greater than selling price";
    }

    if (newProduct.quantity < 0) return "Quantity cannot be negative";

    return "";
  };

  const submit = (e) => {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) return setError(msg);

    handleAddProduct(e);
  };

  return (
    <div className="addFormContainer">
      <h3>Add New Product</h3>

      <form onSubmit={submit}>
        {/* Name */}
        <div className="formGroup">
          <label>Product Name *</label>
          <input
            value={newProduct.name || ""}
            onChange={(e) => update({ name: e.target.value })}
            required
          />
        </div>

        {/* Price Row */}
        <div className="grid2">
          <div className="formGroup">
            <label>Selling Price (₹)</label>
            <input
              type="number"
              value={newProduct.price ?? ""}
              onChange={(e) =>
                update({
                  price: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              required
            />
          </div>

          <div className="formGroup">
            <label>MRP (₹)</label>
            <input
              type="number"
              value={newProduct.original_price ?? ""}
              onChange={(e) =>
                update({
                  original_price:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* Description */}
        <div className="formGroup">
          <label>Description</label>
          <textarea
            value={newProduct.description || ""}
            onChange={(e) => update({ description: e.target.value })}
            required
          />
        </div>

        {/* Priority + Quantity */}
        <div className="grid2">
          <div className="formGroup">
            <label>Featured</label>
            <div onClick={() => update({ priority: isFeatured ? 2 : 1 })}>
              {isFeatured ? "Yes" : "No"}
            </div>
          </div>

          <div className="formGroup">
            <label>Quantity</label>
            <input
              type="number"
              value={newProduct.quantity ?? 0}
              onChange={(e) =>
                update({
                  quantity:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* Image */}
        <div className="formGroup">
          <label>Image</label>
          <input
            type="file"
            onChange={(e) =>
              update({ image: e.target.files?.[0] || null })
            }
            required
          />
        </div>

        {/* Buttons */}
        <div className="formButtons">
          <button type="submit">Add Product</button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setError("");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddProduct;