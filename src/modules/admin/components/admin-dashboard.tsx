"use client";

import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { Role } from "@/modules/shared/roles";
import Link from "next/link";

type Admin = {
  name: string;
  roles: Role[];
};

function DashboardContent({ admin }: { admin?: Admin }) {
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold text-soraxi-green mb-2">
        Admin Dashboard
      </h1>
      <p className="text-gray-700 mb-8 text-lg">Welcome back, {admin.name}!</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {admin.roles.includes("product_admin") ||
        admin.roles.includes("super_admin") ? (
          <DashboardCard
            title="Products"
            description="Manage and verify products"
            link="/admin/verify-products"
          />
        ) : null}

        {admin.roles.includes("finance_admin") ||
        admin.roles.includes("super_admin") ? (
          <DashboardCard
            title="Finance"
            description="Manage settlements and financial reports"
            link="/admin/settlement"
          />
        ) : null}

        {admin.roles.includes("super_admin") ? (
          <>
            <DashboardCard
              title="Admin Management"
              description="Manage admin accounts and permissions"
              link="/admin/manage-admins"
            />
            <DashboardCard
              title="Admin Audit Log"
              description="View the activities of all admins"
              link="/admin/audit-trail"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="group block focus:outline-none focus:ring-2 focus:ring-soraxi-green rounded-2xl"
    >
      <div className="p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 group-hover:border-soraxi-green">
        <h2 className="text-xl font-semibold text-soraxi-green mb-2 group-hover:underline">
          {title}
        </h2>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}

export const AdminDashboardContent = withAdminAuth(DashboardContent);

// "use client";

// import { withAdminAuth } from "@/modules/auth/with-admin-auth";
// import Link from "next/link";

// function DashboardContent({ admin }: { admin?: any }) {
//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
//       <p className="mb-4">Welcome, {admin.name}!</p>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {admin.roles.includes("product_admin") ||
//         admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Products"
//             description="Manage and verify products"
//             link="/admin/verify-products"
//           />
//         ) : null}

//         {/* {admin.roles.includes("order_admin") ||
//         admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Orders"
//             description="View and manage customer orders"
//             link="/admin/orders"
//           />
//         ) : null} */}

//         {/* {admin.roles.includes("store_admin") ||
//         admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Stores"
//             description="Manage and verify stores"
//             link="/admin/stores"
//           />
//         ) : null} */}

//         {/* {admin.roles.includes("customer_support_admin") ||
//         admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Customer Support"
//             description="Handle customer tickets and inquiries"
//             link="/admin/customer-tickets"
//           />
//         ) : null} */}

//         {admin.roles.includes("finance_admin") ||
//         admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Finance"
//             description="Manage settlements and financial reports"
//             link="/admin/settlement"
//           />
//         ) : null}

//         {admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Admin Management"
//             description="Manage admin accounts and permissions"
//             link="/admin/manage-admins"
//           />
//         ) : null}

//         {admin.roles.includes("super_admin") ? (
//           <DashboardCard
//             title="Admin Audit Log"
//             description="View the activities of all admins"
//             link="/admin/audit-trail"
//           />
//         ) : null}
//       </div>
//     </div>
//   );
// }

// function DashboardCard({
//   title,
//   description,
//   link,
// }: {
//   title: string;
//   description: string;
//   link: string;
// }) {
//   return (
//     <Link href={link} className="block">
//       <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
//         <h2 className="text-lg font-semibold mb-2">{title}</h2>
//         <p className="text-gray-600">{description}</p>
//       </div>
//     </Link>
//   );
// }

// // No specific permissions required for dashboard - just admin authentication
// // Apply the HOC to the client component, not the page
// export const AdminDashboardContent = withAdminAuth(DashboardContent);
