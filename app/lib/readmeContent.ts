export function generateReadmeContent(description: string, convexDeploymentName: string | null) {
  return `# ${description}
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
  
${convexDeploymentName ? generateConvexDeploymentContent(convexDeploymentName) : ''}
  
## Project structure
  
The frontend code is in the \`app\` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the \`convex\` directory.
  
\`npm run dev\` will start the frontend and backend servers.

${convexDeploymentName ? generateConvexDeploymentContent(convexDeploymentName) : ''}

## Project structure

The frontend code is in the \`app\` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the \`convex\` directory.

\`npm run dev\` will start the frontend and backend servers.

## App authentication

Chef apps have a few changes to make development easier, but you may wish to change them when deploying your app
and sharing it more broadly.

* They use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in
* Apps automatically sign in the user anonymously

## Developing and deploying your appgit 

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further
`;
}

function generateConvexDeploymentContent(convexDeploymentName: string) {
  return `This project is connected to the Convex deployment named [\`${convexDeploymentName}\`](https://dashboard.convex.dev/d/${convexDeploymentName}).`;
}
