install:
	npm install
build:
	rm -rf dist
	npm run build
start:
	DEBUG=axios,page-loader,nock.* npx babel-node -- 'src/bin/pageLoader.js'
publish:
	npm publish --dry-run
installApp:
	npm link
removeApp:
	npm unlink
lint:
	npx eslint .
test:
	npm run test
test-coverage:
	npm test -- --coverage
watch:
	DEBUG=axios,page-loader,nock.* npm run testWatch
debug:
	DEBUG=axios,page-loader,nock.* npx babel-node -- 'src/bin/pageLoader.js' https://tonytoponi.github.io/