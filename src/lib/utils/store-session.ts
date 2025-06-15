// /**
//  * Store Session Management Utilities
//  * Handles store-specific session data separate from user authentication
//  */

// export interface StoreSession {
//   storeId: string
//   storeName: string
//   storeEmail: string
//   status: "active" | "pending" | "suspended" | "rejected"
//   loginTime: string
// }

// /**
//  * Get current store session from localStorage
//  */
// export function getStoreSession(): StoreSession | null {
//   if (typeof window === "undefined") return null

//   try {
//     const sessionData = localStorage.getItem("storeSession")
//     if (!sessionData) return null

//     const session: StoreSession = JSON.parse(sessionData)

//     // Check if session is expired (24 hours)
//     const loginTime = new Date(session.loginTime)
//     const now = new Date()
//     const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)

//     if (hoursDiff > 24) {
//       clearStoreSession()
//       return null
//     }

//     return session
//   } catch (error) {
//     console.error("Error parsing store session:", error)
//     clearStoreSession()
//     return null
//   }
// }

// /**
//  * Set store session in localStorage
//  */
// export function setStoreSession(session: StoreSession): void {
//   if (typeof window === "undefined") return

//   try {
//     localStorage.setItem("storeSession", JSON.stringify(session))
//   } catch (error) {
//     console.error("Error setting store session:", error)
//   }
// }

// /**
//  * Clear store session from localStorage
//  */
// export function clearStoreSession(): void {
//   if (typeof window === "undefined") return

//   try {
//     localStorage.removeItem("storeSession")
//   } catch (error) {
//     console.error("Error clearing store session:", error)
//   }
// }

// /**
//  * Check if user has an active store session
//  */
// export function hasActiveStoreSession(): boolean {
//   return getStoreSession() !== null
// }

// /**
//  * Get store ID from current session
//  */
// export function getCurrentStoreId(): string | null {
//   const session = getStoreSession()
//   return session?.storeId || null
// }
