import "./Admin.css";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaBoxes,
  FaEdit,
  FaFolder,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash
} from "react-icons/fa";

import { getApiUrl } from "../../utils/api";
import { getImageList } from "../../utils/imageFallback";
import ConfirmModal from "../../components/ConfirmModal";

const CATEGORY_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23f3ede7'/%3E%3Cpath d='M90 315h460L425 165 328 270l-64-72z' fill='%23d7c7b7'/%3E%3Ccircle cx='216' cy='145' r='38' fill='%23e7d8c8'/%3E%3Ctext x='320' y='365' text-anchor='middle' font-family='Arial' font-size='28' fill='%23705a4b'%3ECategory Image%3C/text%3E%3C/svg%3E";

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Category Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addImage, setAddImage] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit Category Modal state
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Category state
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl("/api/categories"), {
        cache: "no-store"
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load categories");
      }

      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
      toast.error("Failed to load categories");
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }

  /* ADD CATEGORY */
  function openAddModal() {
    setAddName("");
    setAddImage("");
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
    setAddName("");
    setAddImage("");
  }

  function handleAddImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image size must not exceed 15 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAddImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleAddCategorySubmit(event) {
    event.preventDefault();
    const name = addName.trim();

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    if (!addImage) {
      toast.error("Category image is required");
      return;
    }

    try {
      setIsAdding(true);
      const payload = new FormData();
      payload.append("name", name);

      if (addImage.startsWith("data:image/")) {
        const imageResponse = await fetch(addImage);
        const blob = await imageResponse.blob();
        const extension =
          blob.type === "image/png"
            ? "png"
            : blob.type === "image/webp"
            ? "webp"
            : "jpg";
        payload.append("images", blob, `category-image.${extension}`);
      } else {
        payload.append("image", addImage);
      }

      const response = await fetch(getApiUrl("/api/categories"), {
        method: "POST",
        credentials: "include",
        body: payload
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add category");
      }

      toast.success(`Category "${name}" created successfully`);
      closeAddModal();
      await loadCategories();
    } catch (error) {
      toast.error(error.message || "Failed to create category");
    } finally {
      setIsAdding(false);
    }
  }

  /* EDIT CATEGORY */
  function openEditCategory(category) {
    setEditingCategory(category);
    setEditName(category.name || "");
    setEditImage(getImageList(category)[0] || "");
  }

  function closeEditCategory() {
    setEditingCategory(null);
    setEditName("");
    setEditImage("");
  }

  function handleEditImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image size must not exceed 15 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function saveCategoryEdit(event) {
    event.preventDefault();
    if (!editingCategory) return;

    const name = editName.trim();
    if (!name || !editImage) {
      toast.error("Category name and image are required");
      return;
    }

    try {
      setIsSavingEdit(true);
      const payload = new FormData();
      payload.append("name", name);

      if (editImage.startsWith("data:image/")) {
        const imageResponse = await fetch(editImage);
        const blob = await imageResponse.blob();
        const extension =
          blob.type === "image/png"
            ? "png"
            : blob.type === "image/webp"
            ? "webp"
            : "jpg";
        payload.append("images", blob, `category-image.${extension}`);
      } else {
        payload.append("image", editImage);
      }

      const response = await fetch(getApiUrl(`/api/categories/${editingCategory.id}`), {
        method: "PUT",
        credentials: "include",
        body: payload
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update category");
      }

      toast.success("Category updated successfully");
      closeEditCategory();
      await loadCategories();
    } catch (error) {
      console.error("Unable to update category:", error);
      toast.error(error.message || "Unable to update category");
    } finally {
      setIsSavingEdit(false);
    }
  }

  /* DELETE CATEGORY */
  function handleRequestDelete(category) {
    const count = Number(category.productCount ?? category.product_count ?? 0);
    if (count > 0) {
      toast.error(
        `Cannot delete "${category.name}" because ${count} product(s) are assigned to it. Reassign or delete those products first.`,
        { duration: 5000 }
      );
      return;
    }
    setDeleteCategoryTarget(category);
  }

  async function deleteCategory() {
    const id = deleteCategoryTarget?.id;
    if (!id || isDeleting) return;

    try {
      setIsDeleting(true);
      const numericId = Number(id);

      if (!Number.isInteger(numericId)) {
        throw new Error("Unable to delete category");
      }

      const response = await fetch(getApiUrl(`/api/categories/${id}`), {
        method: "DELETE",
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete category");
      }

      toast.success("Category deleted successfully");
      setCategories(prev => prev.filter(c => String(c.id) !== String(id)));
      await loadCategories();
    } catch (error) {
      console.error("Unable to delete category:", error);
      toast.error(error.message || "Failed to delete category");
    } finally {
      setIsDeleting(false);
      setDeleteCategoryTarget(null);
    }
  }

  function handleImageError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = CATEGORY_PLACEHOLDER;
  }

  // Filtered categories
  const filteredCategories = categories.filter(category => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return String(category.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="admin-page">
      {/* HEADER */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Manage Categories</h1>
          <p className="admin-page-subtitle">
            Organize catalog classifications · Total Categories: {categories.length}
          </p>
        </div>
        <button
          type="button"
          className="admin-primary-action-btn"
          onClick={openAddModal}
        >
          <FaPlus /> Add New Category
        </button>
      </div>

      {/* SEARCH / CONTROLS */}
      <div className="admin-order-controls-bar">
        <div className="admin-search-box-form admin-search-box-form--no-submit">
          <FaSearch className="admin-search-input-icon" />
          <input
            type="text"
            placeholder="Search categories by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear-inline"
              onClick={() => setSearchQuery("")}
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* CATEGORIES GRID */}
      {isLoading ? (
        <div className="admin-loading-card">
          <p>Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="admin-empty-box">
          <h2>No Categories Found</h2>
          <p>Click "Add New Category" to create your first product category.</p>
          <button type="button" className="empty-btn" onClick={openAddModal}>
            <FaPlus /> Create First Category
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="admin-empty-box">
          <h2>No Matching Categories</h2>
          <p>No categories match "{searchQuery}".</p>
          <button type="button" className="empty-btn" onClick={() => setSearchQuery("")}>
            Clear Search
          </button>
        </div>
      ) : (
        <div className="admin-categories-grid">
          {filteredCategories.map(category => {
            const productCount = Number(category.productCount ?? category.product_count ?? 0);

            return (
              <div key={category.id} className="admin-category-card">
                <div
                  className="admin-card-image-frame admin-category-image-frame"
                  onClick={() => openEditCategory(category)}
                  style={{ cursor: "pointer" }}
                  title={`Click to edit ${category.name}`}
                >
                  <img
                    src={getImageList(category)[0] || CATEGORY_PLACEHOLDER}
                    alt={category.name}
                    loading="lazy"
                    onError={handleImageError}
                  />
                </div>

                <div className="admin-category-info">
                  <div
                    className="admin-category-header"
                    onClick={() => openEditCategory(category)}
                    style={{ cursor: "pointer" }}
                    title={`Click to edit ${category.name}`}
                  >
                    <h3 className="admin-category-name" title={category.name}>
                      {category.name}
                    </h3>
                    <span className="admin-category-count-badge">
                      {productCount} {productCount === 1 ? "product" : "products"}
                    </span>
                  </div>

                  <div className="admin-category-actions">
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--edit"
                      onClick={() => openEditCategory(category)}
                    >
                      <FaEdit /> Edit
                    </button>

                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--delete"
                      onClick={() => handleRequestDelete(category)}
                      title={
                        productCount > 0
                          ? `Cannot delete: ${productCount} product(s) assigned`
                          : "Delete Category"
                      }
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD CATEGORY MODAL */}
      {isAddModalOpen && (
        <div className="admin-modal-backdrop" onClick={closeAddModal}>
          <form
            className="admin-edit-modal admin-category-modal"
            onSubmit={handleAddCategorySubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-category-modal-header admin-modal-header">
              <h2>Add New Category</h2>
              <button
                type="button"
                className="admin-modal-close-icon-btn"
                onClick={closeAddModal}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="admin-category-modal-body">
              <label className="admin-input-label">
                <span>Category Name *</span>
                <input
                  type="text"
                  placeholder="e.g. Wall Arts, Dining Tables, Clock"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className="admin-input-label">
                <span>Category Image *</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddImageChange}
                  required
                />
              </label>

              {addImage && (
                <div className="admin-modal-preview-wrapper admin-category-preview-wrapper">
                  <span className="admin-preview-label">Image Preview:</span>
                  <div className="admin-category-preview-container">
                    <img
                      className="admin-edit-preview admin-category-preview-img"
                      src={addImage}
                      alt={addName || "Category preview"}
                      onError={handleImageError}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="admin-category-modal-actions admin-modal-actions">
              <button
                type="button"
                className="cancel-btn admin-modal-btn admin-modal-btn--cancel"
                onClick={closeAddModal}
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-submit-btn admin-modal-btn admin-modal-btn--save"
                disabled={isAdding}
              >
                {isAdding ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="admin-modal-backdrop" onClick={closeEditCategory}>
          <form
            className="admin-edit-modal admin-category-modal"
            onSubmit={saveCategoryEdit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-category-modal-header admin-modal-header">
              <h2>Edit Category</h2>
              <button
                type="button"
                className="admin-modal-close-icon-btn"
                onClick={closeEditCategory}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="admin-category-modal-body">
              <label className="admin-input-label">
                <span>Category Name *</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className="admin-input-label">
                <span>Change Image (Optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImage}
                />
              </label>

              <div className="admin-modal-preview-wrapper admin-category-preview-wrapper">
                <span className="admin-preview-label">Current Image:</span>
                <div className="admin-category-preview-container">
                  <img
                    className="admin-edit-preview admin-category-preview-img"
                    src={editImage || CATEGORY_PLACEHOLDER}
                    alt={editName || "Category preview"}
                    onError={handleImageError}
                  />
                </div>
              </div>
            </div>

            <div className="admin-category-modal-actions admin-modal-actions">
              <button
                type="button"
                className="cancel-btn admin-modal-btn admin-modal-btn--cancel"
                onClick={closeEditCategory}
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-submit-btn admin-modal-btn admin-modal-btn--save"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteCategoryTarget !== null}
        title="Delete Category"
        message={`Are you sure you want to permanently delete the category "${deleteCategoryTarget?.name}"? This action cannot be undone.`}
        cancelText="Cancel"
        confirmText={isDeleting ? "Deleting..." : "Delete Category"}
        danger
        onCancel={() => setDeleteCategoryTarget(null)}
        onConfirm={deleteCategory}
      />
    </div>
  );
}

export default AdminCategories;
