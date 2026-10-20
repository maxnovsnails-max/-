
const form = document.querySelector("#recipe-form");
const input = document.querySelector("#products");
const results = document.querySelector("#results");
const message = document.querySelector("#message");

let recipes = [];

// Приводим текст к единому виду для поиска
function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Небольшой словарь синонимов
const aliases = {
  "курицу": "курица",
  "куриное филе": "курица",
  "куриная грудка": "курица",
  "куриные грудки": "курица",
  "картошка": "картофель",
  "помидоры": "помидор",
  "томаты": "помидор",
  "яйца": "яйцо",
  "макароны": "паста",
  "говядина": "говядина",
  "фарш": "фарш",
  "лук репчатый": "лук",
  "чеснок": "чеснок",
  "сметана": "сметана",
  "масло сливочное": "сливочное масло",
  "масло растительное": "растительное масло"
};

function canonical(text) {
  const value = normalize(text);
  return aliases[value] || value;
}

// Загружаем локальную базу один раз
async function loadRecipes() {
  try {
    message.textContent = "Загружаем базу рецептов...";

    const response = await fetch("./recipes.json");

    if (!response.ok) {
      throw new Error("Не удалось открыть recipes.json");
    }

    const data = await response.json();

    if (!Array.isArray(data.recipes)) {
      throw new Error("В файле не найден список recipes");
    }

    recipes = data.recipes;

    message.textContent =
      "Создатель сайта: hamster14" + recipes.length;
  } catch (error) {
    console.error(error);
    message.textContent =
      "Не удалось загрузить базу. Проверь, что recipes.json лежит рядом с index.html и сайт открыт через Live Server.";
  }
}

// Показываем количество и единицы измерения
function formatIngredient(ingredient) {
  const name = ingredient.name?.ru || ingredient.id || "Ингредиент";
  const quantity = ingredient.quantity;
  const unit = ingredient.unit || "";
  const note = ingredient.note?.ru || "";

  let text = name;

  if (quantity !== null && quantity !== undefined && quantity !== "") {
    text += " — " + quantity;

    const units = {
      g: "г",
      kg: "кг",
      ml: "мл",
      l: "л",
      piece: "шт.",
      pieces: "шт.",
      tbsp: "ст. л.",
      tsp: "ч. л.",
      pinch: "щепотка",
      clove: "зубчик"
    };

    text += units[unit] ? " " + units[unit] : unit ? " " + unit : "";
  }

  if (note) text += " (" + note + ")";

  return text;
}

// Проверяем, подходит ли ингредиент под введённый продукт
function ingredientMatches(ingredient, product) {
  const name = canonical(ingredient.name?.ru || ingredient.id || "");
  const search = canonical(product);

  if (!name || !search) return false;

  return name === search ||
    name.startsWith(search + " ") ||
    search.startsWith(name + " ");
}

// Ищем рецепты по введённым продуктам
function searchRecipes(products) {
  return recipes
    .map(recipe => {
      const ingredients = recipe.ingredients || [];

      const matchedProducts = products.filter(product =>
        ingredients.some(ingredient =>
          ingredientMatches(ingredient, product)
        )
      );

      const missingIngredients = ingredients.filter(ingredient =>
        !products.some(product =>
          ingredientMatches(ingredient, product)
        )
      );

      return {
        recipe,
        matchedCount: matchedProducts.length,
        matchedProducts,
        missingIngredients
      };
    })
    .filter(item => item.matchedCount > 0)
    .sort((a, b) =>
      b.matchedCount - a.matchedCount ||
      a.missingIngredients.length - b.missingIngredients.length
    );
}

// Создаём карточку блюда
function renderRecipe(item) {
  const recipe = item.recipe;
  const card = document.createElement("article");
  card.className = "recipe";

  const title = document.createElement("h2");
  title.textContent = recipe.name?.ru || recipe.name?.en || "Блюдо";

  const summary = document.createElement("p");
  summary.textContent =
    recipe.summary?.ru || "Описание отсутствует.";

  card.append(title, summary);

  if (recipe.photo?.url) {
    const photo = document.createElement("img");
    photo.src = recipe.photo.url;
    photo.alt = title.textContent;
    photo.loading = "lazy";
    photo.style.width = "100%";
    photo.style.maxWidth = "360px";
    photo.style.borderRadius = "12px";
    card.append(photo);
  }

  const match = document.createElement("p");
  match.textContent =
    "Совпало продуктов: " + item.matchedCount +
    " из " + (recipe.ingredients || []).length;

  card.append(match);

  const ingredientsTitle = document.createElement("h3");
  ingredientsTitle.textContent = "Ингредиенты";

  const ingredientsList = document.createElement("ul");

  for (const ingredient of recipe.ingredients || []) {
    const li = document.createElement("li");
    li.textContent = formatIngredient(ingredient);

    if (item.matchedProducts.some(product =>
      ingredientMatches(ingredient, product)
    )) {
      li.style.fontWeight = "bold";
    }

    ingredientsList.append(li);
  }

  card.append(ingredientsTitle, ingredientsList);

  if (item.missingIngredients.length > 0) {
    const missing = document.createElement("p");
    missing.textContent =
      "Другие продукты, которые понадобятся: " +
      item.missingIngredients
        .map(ingredient => ingredient.name?.ru || ingredient.id)
        .filter(Boolean)
        .join(", ");

    card.append(missing);
  } else {
    const allAvailable = document.createElement("p");
    allAvailable.textContent =
      "Все ингредиенты есть в твоём списке!";
    card.append(allAvailable);
  }

  const stepsTitle = document.createElement("h3");
  stepsTitle.textContent = "Приготовление";
  card.append(stepsTitle);

  const stepsList = document.createElement("ol");

  for (const step of recipe.steps || []) {
    const li = document.createElement("li");
    li.textContent = step.text?.ru || step.text?.en || "";

    if (step.minutes) {
      li.textContent += " (примерно " + step.minutes + " мин.)";
    }

    stepsList.append(li);
  }

  if (stepsList.children.length) {
    card.append(stepsList);
  } else {
    const noSteps = document.createElement("p");
    noSteps.textContent = "Инструкция для этого блюда отсутствует.";
    card.append(noSteps);
  }

  // Указываем источник базы и сведения об авторе фотографии
  const credit = document.createElement("p");
  credit.style.fontSize = "12px";
  credit.style.opacity = "0.75";
  credit.textContent =
    "Источник рецептов: UniTools. Лицензия базы: CC BY-SA 4.0.";

  card.append(credit);

  if (recipe.photo?.author || recipe.photo?.license) {
    const photoCredit = document.createElement("p");
    photoCredit.style.fontSize = "12px";
    photoCredit.style.opacity = "0.75";
    photoCredit.textContent =
      "Фото: " +
      (recipe.photo.author || "автор не указан") +
      ". Лицензия: " +
      (recipe.photo.license || "не указана") +
      ".";

    card.append(photoCredit);
  }

  results.append(card);
}

// Обработка формы поиска
form.addEventListener("submit", event => {
  event.preventDefault();

  if (!recipes.length) {
    message.textContent =
      "База ещё загружается или не загрузилась. Проверь файл recipes.json.";
    return;
  }

  const products = input.value
    .split(",")
    .map(canonical)
    .filter(Boolean);

  results.replaceChildren();

  if (!products.length) {
    message.textContent = "Введи продукты через запятую.";
    return;
  }

  const found = searchRecipes(products);

  if (!found.length) {
    message.textContent =
      "Ничего не найдено. Попробуй другие названия продуктов.";
    return;
  }

  // Показываем до 20 подходящих рецептов
  const shown = found.slice(0, 20);

  for (const item of shown) {
    renderRecipe(item);
  }

  message.textContent =
    "Найдено блюд: " + found.length +
    ". Показано: " + shown.length + ".";
});

// Загружаем базу при открытии страницы
loadRecipes();
