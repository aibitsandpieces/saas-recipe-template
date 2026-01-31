"use server";

import { Recipe } from "@/types";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { createSupabaseClient } from "../supabase";
import { getCurrentUser, requireUserWithOrg } from "../auth/user";

// Get all recipes in the current user's organisation, with author details and unlocked status
export const getRecipes = async () => {
  const user = await getCurrentUser();
  if (!user || !user.organisationId) {
    // Return empty array for users without organisation context
    return [];
  }

  const supabase = await createSupabaseClient();

  // Get all recipes from the user's organisation
  // RLS policies will automatically filter by organisation_id from JWT claims
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, name, ingredients, user_id, organisation_id");

  if (error) throw new Error(error.message);

  // Get all user ids from the recipes (these are the authors of the recipes)
  const userIds = recipes.map((recipe) => recipe.user_id);

  const clerk = await clerkClient();
  const users = await clerk.users.getUserList({ userId: userIds });

  // Get unlocked recipes for current user within their organisation
  const { data: unlockedRecipes, error: unlockedError } = await supabase
    .from("recipes_unlocked")
    .select("recipe_id")
    .eq("user_id", user.clerkId);

  if (unlockedError) throw new Error(unlockedError.message);

  const unlockedRecipeIds = new Set(unlockedRecipes.map((r) => r.recipe_id));

  // Merge all data
  const recipesWithUserDetails = recipes.map((recipe) => {
    const recipeUser = users.data.find((u) => u.id === recipe.user_id);
    return {
      ...recipe,
      userFirstName: recipeUser?.firstName,
      userImageUrl: recipeUser?.imageUrl,
      unlocked: unlockedRecipeIds.has(recipe.id) || recipe.user_id === user.clerkId,
    };
  });

  return recipesWithUserDetails;
};

// Get a single recipe by id within the user's organisation
export const getRecipe = async (id: string) => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    throw new Error("Unauthorized: User not assigned to organisation");
  }

  const supabase = await createSupabaseClient();

  // Fetch the recipe (RLS will automatically filter by organisation)
  const { data: recipeData, error: recipeError } = await supabase
    .from("recipes")
    .select()
    .eq("id", id)
    .single();

  if (recipeError) throw new Error(recipeError.message);

  // If the user is the author, return the recipe directly
  if (recipeData.user_id === user.clerkId) return recipeData;

  // Otherwise check if the recipe is unlocked for this user
  const { data: unlockedRecipe, error: unlockedError } = await supabase
    .from("recipes_unlocked")
    .select()
    .eq("user_id", user.clerkId)
    .eq("recipe_id", id);

  if (unlockedError) throw new Error(unlockedError.message);

  // If it's not unlocked, return null
  if (unlockedRecipe.length === 0) return null;

  return recipeData;
};

// Create a new recipe within the user's organisation
export const createRecipe = async (recipe: Recipe) => {
  const { user, organisationId } = await requireUserWithOrg();

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      name: recipe.name,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      user_id: user.clerkId,
      organisation_id: organisationId,
    })
    .select();

  if (error) throw new Error(error.message);

  return data[0];
};

// Get all recipes created by the current user within their organisation
export const getUserRecipes = async () => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    throw new Error("Unauthorized: User not assigned to organisation");
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user.clerkId);

  if (error) throw new Error(error.message);

  return data;
};

// Get all recipes unlocked by the current user within their organisation
export const getUnlockedRecipes = async () => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    throw new Error("Unauthorized: User not assigned to organisation");
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("recipes_unlocked")
    .select("recipes:recipe_id (*)")
    .eq("user_id", user.clerkId);

  if (error) throw new Error(error.message);

  const recipes = data.map((entry) => entry.recipes as unknown as Recipe);

  return recipes;
};

// Unlock a recipe for the current user within their organisation
export const unlockRecipe = async (recipeId: string) => {
  const { has } = await auth();
  const { user, organisationId } = await requireUserWithOrg();

  const supabase = await createSupabaseClient();

  // Determine user's limit based on Clerk Billing Plan and features
  let limit: number | null = null;

  if (has({ feature: "recipe_limit_unlimited" })) {
    limit = null; // no limit
  } else if (has({ feature: "recipe_limit_100" })) {
    limit = 100;
  } else if (has({ feature: "recipe_limit_3" })) {
    limit = 3;
  } else {
    limit = 1; // default fallback just in case
    console.error(
      "User has no recipe limit set. Check Clerk Billing Plan and features for spelling."
    );
  }

  // Check how many recipes the user has unlocked in their organisation
  const { count, error: countError } = await supabase
    .from("recipes_unlocked")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.clerkId);

  if (countError) throw new Error(countError.message);

  // If limit is not unlimited, enforce it
  if (count !== null && limit !== null && count >= limit) {
    return { success: false, message: "limit reached" };
  }

  // Unlock the recipe within the user's organisation
  const { error } = await supabase
    .from("recipes_unlocked")
    .insert({
      user_id: user.clerkId,
      recipe_id: recipeId,
      organisation_id: organisationId
    });

  if (error) throw new Error(error.message);

  return { success: true, message: "recipe unlocked" };
};
