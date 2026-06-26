automata {
  // Parâmetros gerais
  def artifactId = 'wallet-sdk'
  def groupId = 'br.gov.dataprev.inji'

  // Parâmetros gerais
  type = 'CUSTOM'
  descriptor = 'package.json'

  qa.sonarOpts = '-Dsonar.exclusions=**/node_modules/**,**/lib/**,**/*.java,**/*.kt,**/*.class'
  qa.encoding = 'UTF-8'

  notifications.add type: 'mail', condition: 'unstable, failure, promotion', to: 'alexandre.dekker@dataprev.gov.br'

  artifacts.add descriptor: 'groupId=${groupId},artifactId=${artifactId},version=${version}', file: '${groupId}-${artifactId}-${version}.tgz'

  build.agent.image = 'redhat/nodejs-18:9.5-1737531284'
  build.agent.args = '-e NPM_CONFIG_PREFIX=/tmp -e HOME=/tmp -e NODE_TLS_REJECT_UNAUTHORIZED=0'

  build.script = {
    sh '''\
    npm set strict-ssl false && \
    git config --global http.sslverify false && \
    npm install && \
    npm pack'''
  }
}
