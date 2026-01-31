"use server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { revalidatePath } from "next/cache";
import { requireUserWithOrg, getCurrentUser } from "../auth/user";

// Create a new comment within the user's organisation
export const createComment = async (comment: string, recipeId: string) => {
  const { user, organisationId } = await requireUserWithOrg();

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase.from("comments").insert({
    comment,
    user_id: user.clerkId,
    recipe_id: recipeId,
    organisation_id: organisationId,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/recipes/${recipeId}`);

  return data;
};

// Get all comments for a recipe within the user's organisation
export const getRecipeComments = async (recipeId: string) => {
  const user = await getCurrentUser();

  if (!user || !user.organisationId) {
    // Return empty array for users without organisation context
    return [];
  }

  const supabase = await createSupabaseClient();

  // RLS policies will automatically filter comments by organisation
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const userIds = data.map((comment) => comment.user_id);

  const clerk = await clerkClient();
  const users = await clerk.users.getUserList({ userId: userIds });

  const commentsWithUserDetails = data.map((comment) => {
    const commentUser = users.data.find((u) => u.id === comment.user_id);

    return {
      ...comment,
      userFirstName: commentUser?.firstName,
      userImageUrl: commentUser?.imageUrl,
    };
  });

  return commentsWithUserDetails;
};
