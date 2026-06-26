automata {
  // Parâmetros gerais
  def artifactId = 'wallet-sdk'
  def groupId = 'br.gov.dataprev.inji'

  // Parâmetros gerais
  type = 'CUSTOM'
  descriptor = 'package.json'

  //qa.sonarOpts = "-Dsonar.projectKey=${groupId} -Dsonar.projectVersion=${version} -Dsonar.sources=src -Dsonar.exclusions=**/node_modules/**,**/lib/**,**/*.java,**/*.kt,**/*.class -Dsonar.java.binaries=. -Dsonar.findbugs.allowuncompiledcode=true"
  //qa.encoding = 'UTF-8'

  notifications.add type: 'mail', condition: 'unstable, failure, promotion', to: 'alexandre.dekker@dataprev.gov.br'

 
  artifacts.add descriptor: 'groupId=${groupId},artifactId=${artifactId},version=${version}', file: '${artifactId}-${version}.tgz'


  build.agent.image = env.CUSTOM_IMAGE
  build.agent.args = "--group-add 1002 -v /var/run/docker.sock:/var/run/docker.sock -e HOME=/tmp -e DOCKER_BUILDKIT=0"

  build.script = {
    docker.withRegistry('https://registry.ctn.prevnet', 'harbor') {
      docker.image('redhat/nodejs-18:9.5-1737531284').inside('-e NPM_CONFIG_PREFIX=/tmp -e HOME=/tmp -e NODE_TLS_REJECT_UNAUTHORIZED=0') {
            sh '''\
            npm set strict-ssl false && \
            git config --global http.sslverify false && \
            npm install && \
            npm pack'''
      }
    }
  }
}
