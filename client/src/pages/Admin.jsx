import "./Admin.css";

function Admin() {
  return (

    <div className="admin">

      <h1>
        Admin Dashboard
      </h1>

      <form className="product-form">

        <input
          type="text"
          placeholder="Product Name"
        />

        <input
          type="number"
          placeholder="Price"
        />

        <input
          type="text"
          placeholder="Category"
        />

        <input
          type="text"
          placeholder="Image URL"
        />

        <textarea
          placeholder="Product Description"
        />

        <button>
          Add Product
        </button>

      </form>

    </div>

  );
}

export default Admin;