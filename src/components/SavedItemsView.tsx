import { useQuery } from "@tanstack/react-query"
import { useSavedItems } from "../api-client/memberTools"
import { useFeedPosts } from "../api-client/posts"
import { api } from "../api-client/server"
import PostCard, { type Post } from "./PostCard"
import type { Resource } from "./ResourcesView"
import SaveItemButton from "./SaveItemButton"
import { openExternal } from "../lib/openExternal"
import { useUIStore } from "../store/ui"
export default function SavedItemsView() {
  const saved = useSavedItems(),
    posts = useFeedPosts(),
    viewResource = useUIStore((s) => s.viewResource)
  const resources = useQuery({
    queryKey: ["saved-resources"],
    queryFn: () => api<Resource[]>("/resources"),
  })
  const pending = saved.isPending || posts.isPending || resources.isPending
  const error = saved.isError || posts.isError || resources.isError
  return (
    <div>
      <h1>Saved posts &amp; resources</h1>
      <p>Only you can see your saved list.</p>
      {pending && <p role="status">Loading saved items…</p>}
      {error && (
        <p role="alert">
          Unable to load saved items.{" "}
          <button
            onClick={() => {
              saved.refetch()
              posts.refetch()
              resources.refetch()
            }}
          >
            Retry
          </button>
        </p>
      )}
      {!pending && !error && !saved.data?.length && (
        <p>Save a post or resource to find it here later.</p>
      )}
      {!pending &&
        !error &&
        saved.data?.map((item) => {
          if (item.kind === "post") {
            const post = posts.data?.find((p) => p.id === item.item_id)
            return post ? (
              <PostCard
                key={`post-${item.item_id}`}
                post={post as unknown as Post}
              />
            ) : (
              <section
                className="member-tool-section"
                key={`post-${item.item_id}`}
              >
                <p>This post is no longer available to you.</p>
                <SaveItemButton kind="post" id={item.item_id} />
              </section>
            )
          }
          const resource = resources.data?.find((r) => r.id === item.item_id)
          return (
            <section
              className="member-tool-section"
              key={`resource-${item.item_id}`}
            >
              <h2>{resource?.title ?? "Resource no longer available"}</h2>
              {resource && (
                <>
                  <p>{resource.author}</p>
                  <p>{resource.description}</p>
                  <button onClick={() => viewResource(resource.id)}>
                    Open resource
                  </button>{" "}
                </>
              )}
              <SaveItemButton kind="resource" id={item.item_id} />
            </section>
          )
        })}
    </div>
  )
}
