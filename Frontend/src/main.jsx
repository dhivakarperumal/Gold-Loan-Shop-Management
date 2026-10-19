import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./PrivateRouter/AuthContext.jsx";
import { StoreProvider } from "./PrivateRouter/StoreContext.jsx";
import PrivateRoute from "./PrivateRouter/PrivateRouter.jsx";
import { AdminProvider } from "./PrivateRouter/AdminContext.jsx";
import { GoldRatesProvider } from "./PrivateRouter/GoldRatesContext.jsx";
import { Toaster } from "react-hot-toast";
import Loader from "./Components/CommenComponents/Loader.jsx";

// Lazy Load Main Components
const Home = React.lazy(() => import("./Components/Home/Home.jsx"));
const StoreProductDetail = React.lazy(() => import("./Components/Products/ProductDetail.jsx"));
const Explore = React.lazy(() => import("./Components/Products/Explore.jsx"));

const Login = React.lazy(() => import("./Components/Auth/Login.jsx"));
const Register = React.lazy(() => import("./Components/Auth/Register.jsx"));

// Lazy Load Admin Components
const AdminPanel = React.lazy(() => import("./Admin/AdminPanel.jsx"));
const Dashboard = React.lazy(() => import("./Admin/Dashboard.jsx"));
const Users = React.lazy(() => import("./Admin/Pages/Users.jsx"));
const Category = React.lazy(() => import("./Admin/Categery/Category.jsx"));
const Metals = React.lazy(() => import("./Admin/Metal Type/Metals.jsx"));
const AddProducts = React.lazy(() => import("./Admin/Products/AddProducts.jsx"));
const AllProducts = React.lazy(() => import("./Admin/Products/AllProducts.jsx"));
const AddStock = React.lazy(() => import("./Admin/Products/AddStock.jsx"));
const ProductDetail = React.lazy(() => import("./Admin/Products/ProductDetail.jsx"));
const StockDetails = React.lazy(() => import("./Admin/Pages/StockDetails.jsx"));
const LoanCustomerManagement = React.lazy(() => import("./Admin/Loanmanagements/LoanCustomerManagement.jsx"));
const LoanCustomerDetails = React.lazy(() => import("./Admin/Loanmanagements/LoanCustomerDetails.jsx"));
const CreateLoan = React.lazy(() => import("./Admin/Loanmanagements/CreateLoan.jsx"));
const AllLoans = React.lazy(() => import("./Admin/Loanmanagements/AllLoans.jsx"));
const LoanDetails = React.lazy(() => import("./Admin/Loanmanagements/LoanDetails.jsx"));
const InterestManagement = React.lazy(() => import("./Admin/Loanmanagements/InterestManagement.jsx"));
const BannerManagement = React.lazy(() => import("./Admin/Marketing/BannerManagement.jsx"));
const VideoManagement = React.lazy(() => import("./Admin/Marketing/VideoManagement.jsx"));
const Reviews = React.lazy(() => import("./Admin/Pages/Reviews.jsx"));
const Settings = React.lazy(() => import("./Admin/Pages/Settings.jsx"));
const DailyGoldRate = React.lazy(() => import("./Admin/Pages/DailyGoldRate.jsx"));
const Dealers = React.lazy(() => import("./Admin/Dealers/Dealers.jsx"));
const CustomerKyc = React.lazy(() => import("./Components/Account/CustomerKyc.jsx"));
const AdminKyc = React.lazy(() => import("./Admin/Kyc/AdminKyc.jsx"));
const BillingManagement = React.lazy(() => import("./Admin/Pages/BillingManagement.jsx"));

const ErrorPage = React.lazy(() => import("./Admin/Pages/ErrorPage.jsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home /> },
      { path: "explore", element: <Explore /> },
      { path: "product/:id", element: <StoreProductDetail /> },
      {
        path: "/account/kyc",
        element: (
          <PrivateRoute allowedRoles={["user"]}>
            <CustomerKyc />
          </PrivateRoute>
        )
      },
     

    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/admin",
    element: (
      <PrivateRoute allowedRoles={["admin"]}>
        <AdminProvider>
          <GoldRatesProvider>
            <AdminPanel />
          </GoldRatesProvider>
        </AdminProvider>
      </PrivateRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "users/all", element: <Users /> },
      { path: "kyc", element: <AdminKyc /> },
      { path: "billings", element: <BillingManagement /> },
      { path: "loans/customermanagement", element: <LoanCustomerManagement /> },
      { path: "loans/customers/:id", element: <LoanCustomerDetails /> },
      { path: "loans/createloan", element: <CreateLoan /> },
      { path: "loans/edit/:id", element: <CreateLoan /> },
      { path: "loans/allloans", element: <AllLoans /> },
      { path: "loans/details/:id", element: <LoanDetails /> },
      { path: "loans/interestmanagement", element: <InterestManagement /> },
      { path: "products/category", element: <Category /> },
      { path: "products/add", element: <AddProducts /> },
      { path: "products/all", element: <AllProducts /> },
      { path: "products/stock", element: <StockDetails /> },
      { path: "products/stock/add", element: <AddStock /> },
      { path: "products/edit/:id", element: <AddProducts /> },
      { path: "products/:id", element: <ProductDetail /> },
      { path: "metals", element: <Metals /> },
      { path: "banners", element: <BannerManagement /> },
      { path: "videos", element: <VideoManagement /> },
      { path: "reviews", element: <Reviews /> },
      { path: "dealers/*", element: <Dealers /> },
      { path: "settings", element: <Settings /> },
      { path: "settings/daily-gold-rate", element: <DailyGoldRate /> },
      // { path: "profile", element: <Profile /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="92181265196-n9a9p26qe601hg7lar8acq6s4f1cknq7.apps.googleusercontent.com">
    <AuthProvider>
      <StoreProvider>
        <Toaster position="top-left" reverseOrder={false} />
        <React.Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </React.Suspense>
      </StoreProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);
