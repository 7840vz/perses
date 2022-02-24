// Copyright 2022 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"fmt"
	"os"

	"github.com/perses/perses/internal/cli/cmd/login"
	"github.com/perses/perses/internal/cli/cmd/project"
	"github.com/perses/perses/internal/cli/cmd/version"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

func newRootCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "percli",
		Short: "Command line interface to interact with the Perses API",
	}

	cmd.AddCommand(version.NewCMD())
	cmd.AddCommand(login.NewCMD())
	cmd.AddCommand(project.NewCMD())
	return cmd
}

func initLogrus() {
	logrus.SetFormatter(&logrus.TextFormatter{
		// Useful when you have a TTY attached.
		// Issue explained here when this field is set to false by default:
		// https://github.com/sirupsen/logrus/issues/896
		FullTimestamp: true,
	})
}

func main() {
	initLogrus()
	rootCmd := newRootCommand()
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}