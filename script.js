
const form = document.getElementById("recipe-form");
const productsInput = document.getElementById("products");
const results = document.getElementById("results");
const message = document.getElementById("message");

let recipes = [];

// Не показываем сообщение о загрузке базы
// Скрываем сообщение о загрузке базы
if (message) {
  message.textContent = "";
  message.style.display = "";
}
// Загружаем базу рецептов
async function loadRecipes() {
  try {
    const response = await fetch("./recipes.json");

    if (!response.ok) {
      throw new Error("Не удалось загрузить рецепты");
    }

    const data = await response.json();

    // Поддерживаем базу в виде массива или объекта с массивом рецептов
    recipes = Array.isArray(data)
      ? data
      : data.recipes || data.meals || [];

    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error("В базе нет рецептов");
    }
  } catch (error) {
    console.error("Ошибка загрузки рецептов:", error);

    if (message) {
      message.textContent =
        "Не удалось загрузить рецепты. Проверь файл recipes.json.";
    }
  }
}

// Получаем название рецепта
function getRecipeName(recipe) {
  return recipe.name ||
    recipe.title ||
    recipe.strMeal ||
    recipe.recipeName ||
    "Блюдо без названия";
}

// Получаем ингредиенты рецепта
function getIngredients(recipe) {
  if (Array.isArray(recipe.ingredients)) {
    return recipe.ingredients.map(item => {
      if (typeof item === "string") return item;
      return item.name || item.ingredient || "";
    }).filter(Boolean);
  }

  if (typeof recipe.ingredients === "string") {
    return recipe.ingredients.split(",");
  }

  // Поддержка формата TheMealDB
  const mealIngredients = [];

  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];

    if (ingredient && ingredient.trim()) {
      mealIngredients.push(ingredient.trim());
    }
  }

  return mealIngredients;
}

// Показываем найденные блюда
function showRecipes(foundRecipes, userProducts) {
  results.innerHTML = "";

  if (foundRecipes.length === 0) {
    results.textContent =
      "Не нашли подходящих блюд. Попробуй ввести другие продукты.";
    return;
  }

  foundRecipes.forEach(({ recipe, matches, missing }) => {
    const card = document.createElement("article");
    card.className = "recipe";

    const title = document.createElement("h3");
    title.textContent = getRecipeName(recipe);
    card.appendChild(title);

    const ingredientsTitle = document.createElement("p");
    ingredientsTitle.textContent = "Ингредиенты:";
    card.appendChild(ingredientsTitle);

    const ingredientsList = document.createElement("p");
    ingredientsList.textContent = getIngredients(recipe).join(", ");
    card.appendChild(ingredientsList);

    const matchInfo = document.createElement("p");
    matchInfo.textContent =
      `Совпало продуктов: ${matches.length}` +
      (missing.length
        ? `. Ещё понадобятся: ${missing.join(", ")}`
        : ". У тебя есть все ингредиенты!");
    card.appendChild(matchInfo);

    if (recipe.instructions || recipe.strInstructions) {
      const instructions = document.createElement("p");
      instructions.textContent =
        recipe.instructions || recipe.strInstructions;
      card.appendChild(instructions);
    }

    results.appendChild(card);
  });
}

// Ищем блюда по введённым продуктам
if (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const userProducts = productsInput.value
      .toLowerCase()
      .split(/[,;\n]+/)
      .map(item => item.trim())
      .filter(Boolean);

    results.innerHTML = "";

    if (userProducts.length === 0) {
      if (message) {
        message.textContent = "Сначала введи продукты.";
      }
      return;
    }

    if (recipes.length === 0) {
      if (message) {
        message.textContent =
          "Рецепты ещё не загрузились. Обнови страницу и попробуй снова.";
      }
      return;
    }

    if (message) {
      message.textContent = "";
    }

    const foundRecipes = recipes
      .map(recipe => {
        const ingredients = getIngredients(recipe);

        const matches = ingredients.filter(ingredient => {
          const normalized = ingredient.toLowerCase();

          return userProducts.some(product =>
            normalized.includes(product) ||
            product.includes(normalized)
          );
        });

        const missing = ingredients.filter(ingredient => {
          const normalized = ingredient.toLowerCase();

          return !userProducts.some(product =>
            normalized.includes(product) ||
            product.includes(normalized)
          );
        });

        return { recipe, matches, missing };
      })
      .filter(item => item.matches.length > 0)
      .sort((a, b) => {
        if (b.matches.length !== a.matches.length) {
          return b.matches.length - a.matches.length;
        }
        return a.missing.length - b.missing.length;
      })
      .slice(0, 30);

    showRecipes(foundRecipes, userProducts);
  });
}

// Запускаем загрузку базы
loadRecipes();
