output "vpc_id" {
  description = "The ID of the ShopSphere VPC"
  value       = aws_vpc.shopsphere_vpc.id
}

output "public_subnets" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnets" {
  description = "List of private subnet IDs for EKS worker nodes"
  value       = aws_subnet.private[*].id
}

output "eks_cluster_name" {
  description = "Name of the EKS Cluster"
  value       = aws_eks_cluster.shopsphere.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL for Kubernetes API Server"
  value       = aws_eks_cluster.shopsphere.endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS control plane"
  value       = aws_security_group.eks_cluster_sg.id
}

output "ecr_repository_urls" {
  description = "Map of microservice names to Amazon ECR Repository URLs"
  value = {
    for k, v in aws_ecr_repository.services : k => v.repository_url
  }
}
