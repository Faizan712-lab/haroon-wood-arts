import "./Admin.css";

import {
  useEffect,
  useState
} from "react";

import toast from "react-hot-toast";

import {
  getApiUrl
} from "../../utils/api";
import {
  getImageList
} from "../../utils/imageFallback";

import ConfirmModal from "../../components/ConfirmModal";

const CATEGORY_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23f3ede7'/%3E%3Cpath d='M90 315h460L425 165 328 270l-64-72z' fill='%23d7c7b7'/%3E%3Ccircle cx='216' cy='145' r='38' fill='%23e7d8c8'/%3E%3Ctext x='320' y='365' text-anchor='middle' font-family='Arial' font-size='28' fill='%23705a4b'%3ECategory Image%3C/text%3E%3C/svg%3E";

function AdminCategories() {

  const [categories,
    setCategories] =
    useState([]);

  const [editingCategory,
    setEditingCategory] =
    useState(null);

  const [editName,
    setEditName] =
    useState("");

  const [editImage,
    setEditImage] =
    useState("");

  const [deleteCategoryTarget,
    setDeleteCategoryTarget] =
    useState(null);

  const [isDeleting,
    setIsDeleting] =
    useState(false);

  const [isSavingEdit,
    setIsSavingEdit] =
    useState(false);

  useEffect(() => {

    loadCategories();

  }, []);

  async function loadCategories() {

    try {

      const response = await fetch(
        getApiUrl("/api/categories"),
        {
          cache: "no-store"
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load categories"
        );
      }

      setCategories(data.categories || []);

    } catch (error) {

      console.error(
        "Failed to load categories:",
        error
      );

      setCategories([]);

    }

  }

  async function deleteCategory() {
    const id = deleteCategoryTarget?.id;

    if (!id || isDeleting)
      return;

    try {
      setIsDeleting(true);
      const numericId =
        Number(id);

      if (!Number.isInteger(numericId)) {
        throw new Error(
          "Unable to delete category"
        );
      }

      const response = await fetch(
        getApiUrl(`/api/categories/${id}`),
        {
          method: "DELETE"
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to delete category"
        );
      }

      toast.success("Category deleted successfully");

      setCategories(previous =>
        previous.filter(
          category =>
            String(category.id) !== String(id)
        )
      );

      await loadCategories();
    } catch (error) {
      console.error(
        "Unable to delete category:",
        error
      );

      toast.error(
        error.message || "Failed to delete category"
      );
    } finally {
      setIsDeleting(false);
      setDeleteCategoryTarget(null);
    }

  }

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
    const file =
      event.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onloadend = () => {
      setEditImage(reader.result);
    };

    reader.readAsDataURL(file);
  }

  async function saveCategoryEdit(event) {
    event.preventDefault();

    if (!editingCategory)
      return;

    const name =
      editName.trim();

    if (!name || !editImage) {
      toast.error(
        "Unable to update category"
      );
      return;
    }

    try {
      setIsSavingEdit(true);
      const payload = new FormData();
      payload.append("name", name);

      if (editImage.startsWith("data:image/")) {
        const imageResponse = await fetch(editImage);
        const blob = await imageResponse.blob();
        const extension = blob.type === "image/png"
          ? "png"
          : blob.type === "image/webp"
            ? "webp"
            : "jpg";
        payload.append("images", blob, `category-image.${extension}`);
      } else {
        payload.append("image", editImage);
      }

      const response = await fetch(
        getApiUrl(`/api/categories/${editingCategory.id}`),
        {
          method: "PUT",
          body: payload
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update category"
        );
      }

      setCategories(previous =>
        previous.map(category =>
          String(category.id) ===
          String(editingCategory.id)
            ? data.category
            : category
        )
      );

      toast.success("Category updated successfully");

      closeEditCategory();
      await loadCategories();
    } catch (error) {
      console.error(
        "Unable to update category:",
        error
      );

      toast.error(
        error.message || "Unable to update category"
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleImageError(event) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = CATEGORY_PLACEHOLDER;
  }

  return (

    <div className="admin-page">

      <div className="admin-products-header">

        <div>

          <h1>
            Manage Categories
          </h1>

          <p>
            Total Categories:
            {" "}
            {categories.length}
          </p>

        </div>

      </div>

      {categories.length === 0 ? (

        <div className="admin-empty-box">

          <h2>
            No Categories Found
          </h2>

          <p>
            Categories created on the Add Product page
            will appear here.
          </p>

        </div>

      ) : (

        <div className="admin-categories-grid">

          {categories.map(category => (

            <div
              key={category.id}
              className="admin-category-card"
            >

              <div className="admin-card-image-frame admin-category-image-frame">
                <img
                  src={getImageList(category)[0] || CATEGORY_PLACEHOLDER}
                  alt={category.name}
                  loading="lazy"
                  onError={handleImageError}
                />
              </div>

              <div className="admin-category-info">

                <h3>
                  {category.name}
                </h3>

                <div className="admin-category-actions">

                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() =>
                      openEditCategory(category)
                    }
                  >
                    Edit Category
                  </button>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() =>
                      setDeleteCategoryTarget(category)
                    }
                    disabled={
                      isDeleting &&
                      String(deleteCategoryTarget?.id) ===
                      String(category.id)
                    }
                  >
                    {isDeleting &&
                    String(deleteCategoryTarget?.id) ===
                    String(category.id)
                      ? "Deleting..."
                      : "Delete Category"}
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

      {editingCategory && (

        <div className="admin-modal-backdrop">

          <form
            className="admin-edit-modal"
            onSubmit={saveCategoryEdit}
          >

            <h2>
              Edit Category
            </h2>

            <label>
              Category Name
              <input
                type="text"
                value={editName}
                onChange={(event) =>
                  setEditName(event.target.value)
                }
                required
              />
            </label>

            <label>
              Category Image
              <input
                type="file"
                accept="image/*"
                onChange={handleEditImage}
              />
            </label>

            <img
              className="admin-edit-preview"
              src={editImage || CATEGORY_PLACEHOLDER}
              alt={editName || "Category preview"}
              onError={handleImageError}
            />

            <div className="admin-modal-actions">

              <button
                type="submit"
                className="add-category-btn"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={closeEditCategory}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      )}

      <ConfirmModal
        isOpen={deleteCategoryTarget !== null}
        title="Delete Category"
        message={"This action cannot be undone.\nAre you sure you want to delete this category?"}
        cancelText="Cancel"
        confirmText="Delete Category"
        danger
        onCancel={() =>
          setDeleteCategoryTarget(null)
        }
        onConfirm={deleteCategory}
      />

    </div>

  );

}

export default AdminCategories;
